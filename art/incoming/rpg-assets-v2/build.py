"""Blender 4.1: original stylized assets, embedded PBR atlas, Y-up glTF.
Run: blender --factory-startup -b --python build.py [-- --only weapon-chest]
All outputs stay under art/incoming. No game sources are accessed.
"""
import bpy, math, json, random, sys, struct
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parent.parent
BUILD=Path(__file__).resolve().parent
random.seed(20261022)
PALETTE=[
 ('iron',(.16,.22,.29),.72,.48),('steel',(.46,.64,.73),.70,.34),
 ('gold',(.73,.43,.12),.70,.40),('leather',(.32,.075,.055),.0,.82),
 ('wood',(.045,.17,.29),.0,.76),('bamboo',(.55,.37,.13),.0,.70),
 ('edge',(.72,.83,.87),.75,.28),('stone',(.13,.15,.20),.20,.85),
 ('fire',(1,.19,.025),.15,.33),('ice',(.08,.62,1),.15,.27),
 ('thunder',(1,.71,.06),.25,.30),('dark',(.52,.12,.88),.15,.38),
 ('holy',(1,.73,.23),.35,.32),('sakura',(1,.27,.53),.0,.55),
 ('galaxy',(.14,.26,.90),.20,.32),('rune',(.42,.85,1),.0,.40)]
IDX={x[0]:i for i,x in enumerate(PALETTE)}
def atlas():
    size=1024;cell=256;rng=np.random.default_rng(27)
    base=np.zeros((size,size,4),np.float32);orm=np.ones_like(base);normal=np.ones_like(base);em=np.zeros_like(base)
    y,x=np.mgrid[0:cell,0:cell].astype(np.float32)/(cell-1)
    for i,(name,col,metal,rough) in enumerate(PALETTE):
        grain=np.sin(x*95+y*6+np.sin(y*15)*1.3)*.028+np.sin(x*241-y*9)*.014
        brush=np.sin(x*23+y*14)*np.cos(y*33-x*7)*.032
        mottled=np.sin(x*41+np.sin(y*29)*3)*np.sin(y*53)*.024
        height=brush*.20+mottled*.10
        if name in ['wood','bamboo']:
            grain=np.sin(x*85+np.sin(y*8)*2)*.075+np.sin(x*170+np.cos(y*13)*3)*.025
            height=grain*.55
        if name=='leather':height+=np.sin(y*160)*np.sin(x*145)*.009
        # Broad hand-painted values, dark inset border and a warm edge catchlight.
        border=np.minimum.reduce([x,1-x,y,1-y]);shadow=np.exp(-border*65)*.27
        light=np.exp(-((border-.026)/.014)**2)*.15
        shade=.72+y*.22+(1-x)*.07+grain+brush+mottled-shadow+light
        scratch=np.zeros_like(x)
        if name in ['iron','steel','gold','edge','stone']:
            for k in range(15):
                px,py=rng.uniform(.08,.92,2);length=rng.uniform(.015,.08)
                scratch+=np.exp(-((x-px+(y-py)*.35)/.0025)**2)*np.exp(-((y-py)/length)**8)*rng.uniform(.03,.13)
            height-=scratch*.08
        rgb=np.clip(np.array(col)[None,None,:]*shade[:,:,None]+scratch[:,:,None],0,1)
        sy=(i//4)*cell;sx=(i%4)*cell
        base[sy:sy+cell,sx:sx+cell,:3]=rgb;base[sy:sy+cell,sx:sx+cell,3]=1
        orm[sy:sy+cell,sx:sx+cell,1]=np.clip(rough+brush*.8,0,1)
        orm[sy:sy+cell,sx:sx+cell,2]=metal
        dy,dx=np.gradient(height);nn=np.dstack((-dx*32,-dy*32,np.ones_like(dx)))
        nn/=np.linalg.norm(nn,axis=2,keepdims=True)
        normal[sy:sy+cell,sx:sx+cell,:3]=nn*.5+.5
        if i>=8:em[sy:sy+cell,sx:sx+cell,:3]=rgb*.48
        em[sy:sy+cell,sx:sx+cell,3]=1
    images={}
    for name,data in [('basecolor',base),('normal',normal),('orm',orm),('emissive',em)]:
        im=bpy.data.images.new('WK_'+name,width=size,height=size,alpha=True)
        im.colorspace_settings.name='sRGB' if name in ['basecolor','emissive'] else 'Non-Color'
        im.pixels.foreach_set(data.ravel());im.filepath_raw=str(BUILD/(name+'.png'));im.file_format='PNG';im.save();im.pack();images[name]=im
    m=bpy.data.materials.new('WK_Handpaint_PBR');m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links;p=next(x for x in n if x.type=='BSDF_PRINCIPLED')
    for name in images:
        node=n.new('ShaderNodeTexImage');node.image=images[name];node.interpolation='Linear';node.extension='EXTEND'
        if name=='basecolor':l.new(node.outputs['Color'],p.inputs['Base Color'])
        elif name=='normal':
            nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;l.new(node.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
        elif name=='orm':
            sep=n.new('ShaderNodeSeparateColor');l.new(node.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
        else:l.new(node.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.65
    return m
MAT=atlas()
def tag(o,name,swatch):
    o.name=name;o['swatch']=IDX[swatch];return o
def box(name,p,s,swatch='iron',b=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);tag(o,name,swatch)
    if b:bevel(o,b)
    return o
def bevel(o,w):
    mod=o.modifiers.new('Forged edges','BEVEL');mod.width=w;mod.segments=1
    return o
def cyl(name,p,r,h,swatch='gold',sides=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=h,location=p)
    return tag(bpy.context.object,name,swatch)
def gem(name,p,s,swatch):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
    o=bpy.context.object;o.scale=s;return tag(o,name,swatch)
def beam(name,a,b,r,swatch='gold',sides=6):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)/2,r,(b-a).length,swatch,sides)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def ring(name,p,r,thick,swatch='gold',rot=(0,0,0),segments=24):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments,minor_segments=4,major_radius=r,minor_radius=thick,location=p,rotation=rot)
    return tag(bpy.context.object,name,swatch)
def prism(name,poly,depth,swatch='steel',b=.008):
    n=len(poly);verts=[(x,y,z) for y in [-depth/2,depth/2] for x,z in poly]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    tag(o,name,swatch)
    if b:bevel(o,b)
    return o
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=1;bpy.context.scene.render.fps=30
def grip(bottom,top,r=.045):
    cyl('Leather grip',(0,0,(bottom+top)/2),r,top-bottom,'leather',10)
    for i in range(7):
        o=ring('Raised grip wrap',(0,0,bottom+(top-bottom)*(i+.5)/7),r,.006,'leather',segments=12);o.rotation_euler.y=.13
    for z in [bottom,top]:cyl('Grip ferrule',(0,0,z),r*1.25,.035,'gold')
def empty(name,p=(0,0,0)):
    bpy.ops.object.empty_add(location=p);o=bpy.context.object;o.name=name;return o
def parent_keep(objects,parent):
    bpy.context.view_layer.update()
    for o in objects:o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
def animate(o,name,frames,axis=2,value=math.tau):
    o.rotation_euler[axis]=0;o.keyframe_insert(data_path='rotation_euler',frame=1)
    o.rotation_euler[axis]=value;o.keyframe_insert(data_path='rotation_euler',frame=frames)
    o.animation_data.action.name=name
    for fc in o.animation_data.action.fcurves:
        for k in fc.keyframe_points:k.interpolation='LINEAR'
    bpy.context.scene.frame_end=frames;bpy.context.scene.frame_set(1)

def weapon(kind,tier):
    clear();t=tier;el={'sword':'fire','dagger':'ice','spear':'thunder','axe':'dark','saber':'galaxy','shinai':'sakura','scythe':'holy'}[kind]
    long=kind in ['spear','scythe'];bottom=-.60 if long else -.18;top=.60 if long else .18
    grip(bottom,top,.032 if long else .045)
    gem('Faceted pommel',(0,0,bottom-.045),(.055,.045,.07),'gold' if t>=2 else 'iron')
    z=top+.035
    if kind in ['sword','dagger']:
        L=1.15 if kind=='sword' else .62;w=.095+.012*t;curve=.19 if kind=='sword' else -.07
        poly=[(-w,z),(w,z),(w*.9+curve*.20,z+L*.58),(curve+.045,z+L*.90),(curve,z+L),(-w*.6+curve*.35,z+L*.72)]
        prism('Cutting edge',poly,.050,'edge',.012)
        inset=[(x*.78,z+(zz-z)*.94+.014) for x,zz in poly]
        o=prism('Sculpted blade core',inset,.057,'iron' if el=='fire' else 'steel',.010)
        for s in [-1,1]:
            p=[(s*.055,z+.015),(s*.16,z-.055),(s*.29,z+.015),(s*.34,z+.14),(s*.21,z+.075),(s*.08,z+.08)]
            prism('Forged guard',p,.10,'gold' if t>=2 else 'iron',.012)
        # Substantial collar, inset gemstone and broken runic channels.
        o=prism('Blade collar',[(-.11,z+.05),(-.095,z+.18),(0,z+.25),(.095,z+.18),(.11,z+.05)],.065,'gold',.008)
        if t>=2:
            gem('Set jewel',(0,-.058,z+.13),(.055,.025,.075),el)
            for k in range(t+1):
                zz=z+L*(.25+k*.50/t) if kind=='dagger' else z+.30+k*.13
                cx=curve*.3*(zz-z)/L
                beam('Inset rune',(cx-.025,-.034,zz),(cx+.023,-.034,zz+.055),.006,el,4)
        if t>=3:
            for s in [-1,1]:prism('Guard fluke',[(s*.19,z+.06),(s*.30,z+.10),(s*.27,z+.24),(s*.22,z+.17)],.065,'gold',.007)
        if t==4:
            for s in [-1,1]:gem('Guard socket',(s*.25,-.045,z+.12),(.025,.018,.045),el)
    elif kind=='spear':
        L=.55
        prism('Spear cutting edge',[(-.06,z),(-.14,z+.20),(-.09,z+.34),(0,z+L),(.09,z+.34),(.14,z+.20),(.06,z)],.06,'edge',.010)
        prism('Spear ridge',[(-.035,z),(-.07,z+.23),(0,z+.49),(.07,z+.23),(.035,z)],.075,'gold',.008)
        cyl('Spear socket',(0,0,z),.065,.18,'iron')
        if t>=2:gem('Storm core',(0,-.052,z+.21),(.034,.025,.10),el)
        if t>=3:
            for s in [-1,1]:prism('Storm fork',[(s*.04,z+.03),(s*.17,z+.13),(s*.21,z+.34),(s*.11,z+.24)],.055,'gold',.008)
        if t==4: ring('Storm halo',(0,0,z+.13),.15,.012,'gold',(math.pi/2,0,0))
    elif kind=='axe':
        cyl('Axe socket',(0,0,z),.075,.32,'gold')
        for s in ([1,-1] if t>=3 else [1]):
            p=[(s*.025,z+.13),(s*.19,z+.19),(s*.40,z+.33),(s*.48,z+.16),(s*.47,z-.06),(s*.35,z-.27),(s*.18,z-.06),(s*.025,z-.08)]
            prism('Crescent cutting edge',p,.085,'edge',.012)
            p2=[(x*.81,z+(zz-z)*.79) for x,zz in p];prism('Axe dark inset',p2,.10,'iron',.010)
            if t>=2:beam('Axe inlay',(s*.13,-.057,z+.06),(s*.29,-.057,z+.13),.009,el,4)
        if t>=2:gem('Void socket',(0,-.08,z),(.055,.03,.08),el)
        if t==4:prism('Axe crown',[(-.06,z+.12),(0,z+.40),(.06,z+.12)],.06,'gold',.008)
    elif kind=='scythe':
        p=[(-.06,z+.03),(0,z+.22),(.28,z+.23),(.55,z+.10),(.76,z-.12),(.88,z-.45),(.63,z-.18),(.37,z-.035),(.10,z-.025)]
        prism('Reaper edge',p,.065,'edge',.012)
        prism('Reaper inlay',[(x*.90,z+(zz-z)*.74+.025) for x,zz in p],.078,'gold',.008)
        ring('Reaper halo',(0,0,z+.09),.13,.021,'gold',(math.pi/2,0,0))
        if t>=2:gem('Sun core',(0,-.04,z+.09),(.055,.03,.07),el)
        if t>=3:
            for a in [0,math.pi/2,math.pi,3*math.pi/2]:
                beam('Halo ray',(.13*math.cos(a),0,z+.09+.13*math.sin(a)),(.21*math.cos(a),0,z+.09+.21*math.sin(a)),.014,'gold')
        if t==4:
            prism('Counter hook',[(-.04,z+.06),(-.20,z+.14),(-.27,z-.04),(-.13,z-.02)],.055,'gold')
    elif kind=='saber':
        # Original arcane emitter, not a recognizable franchise hilt.
        cyl('Emitter shroud',(0,0,z-.05),.07,.20,'iron',12)
        for zz in [z-.13,z-.06,z+.01]:ring('Emitter band',(0,0,zz),.071,.012,'gold',segments=16)
        cyl('Arcane blade',(0,0,z+.53),.033,1.06,el,10)
        gem('Blade cap',(0,0,z+1.06),(.033,.033,.055),el)
        if t>=2:gem('Power switch',(0,-.075,z-.07),(.025,.017,.04),el)
        if t>=3:
            for s in [-1,1]:prism('Emitter prong',[(s*.04,z-.04),(s*.10,z+.03),(s*.08,z+.17),(s*.035,z+.10)],.055,'gold')
        if t==4:ring('Arcane emitter ring',(0,0,z+.10),.11,.012,'gold',segments=20)
    else:
        for s in [-1,1]:
            for y in [-.018,.018]:beam('Bamboo stave',(s*.018,y,z),(s*.014,y,z+1.12),.018,'bamboo',6)
        for f in [.02,.58,1.0]:cyl('Shinai binding',(0,0,z+1.12*f),.049,.045,'leather',10)
        cyl('Shinai tsuba',(0,0,z),.12,.025,'iron' if t<3 else 'gold',16)
        beam('Shinai tension cord',(0,-.044,z+.05),(0,-.036,z+1.10),.003,'leather',4)
        if t>=2:gem('Grip seal',(0,-.05,0),(.024,.015,.04),el)
        if t>=3:
            for f in [.02,.58,1]:ring('Binding trim',(0,0,z+1.12*f),.05,.005,'gold',segments=12)
        if t==4:gem('Tip seal',(0,-.04,z+1.08),(.016,.012,.022),el)
    return {'type':'weapon','weapon_type':kind,'tier':tier,'element':el,'target_length':{'sword':1.15,'dagger':.40,'spear':1.60,'axe':.90,'saber':1.10,'shinai':1.15,'scythe':1.60}[kind],'animations':[],'origin':'grip_center','notes':['Four shape tiers cover +1–5 / +6–10 / +11–15 / +16–20.','Representative element baked into texture; not five separate elemental sculpts.']}

def chest():
    clear();z0=.38
    box('Bottom',(0,0,.08),(1.10,.70,.12),'iron',.025)
    for i in range(5):
        x=(i-2)*.207
        for y in [-.315,.315]:box('Oak body plank',(x,y,.32),(.201,.075,.42),'wood',.012)
    for x in [-.51,.51]:box('Oak side',(x,0,.32),(.075,.57,.42),'wood',.018)
    box('Interior lining',(0,0,.15),(.93,.53,.025),'leather',.008)
    for x in [-.52,.52]:
        for y in [-.32,.32]:box('Forged corner',(x,y,.30),(.105,.115,.49),'iron',.018)
    for z in [.12,.53]:
        for y in [-.365,.365]:box('Brass rim',(0,y,z),(1.12,.04,.055),'gold',.009)
    start=set(bpy.context.scene.objects)
    # Six curved wooden slats form a hollow barrel lid.
    for i in range(8):
        a0=math.pi*i/8;a1=math.pi*(i+1)/8
        y0=.35*math.cos(a0);y1=.35*math.cos(a1);z0=.53+.24*math.sin(a0);z1=.53+.24*math.sin(a1)
        o=box('Curved oak lid',(0,(y0+y1)/2,(z0+z1)/2),(1.03,math.hypot(y1-y0,z1-z0)*1.02,.045),'wood',.009)
        o.rotation_euler.x=math.atan2(z1-z0,y1-y0)
    for x in [-.40,.40]:
        for i in range(8):
            a0=math.pi*i/8;a1=math.pi*(i+1)/8
            beam('Lid strap',(x,.36*math.cos(a0),.53+.255*math.sin(a0)),(x,.36*math.cos(a1),.53+.255*math.sin(a1)),.036,'gold',4)
    for x in [-.515,.515]:
        # End panels fit the curved lid profile.
        poly=[(.35*math.cos(math.pi*i/8),.53+.24*math.sin(math.pi*i/8)) for i in range(9)]
        o=prism('Lid end panel',poly,.045,'iron',.008);o.rotation_euler.z=math.pi/2;o.location.x=x
    lidparts=list(set(bpy.context.scene.objects)-start);pivot=empty('LidPivot',(0,.35,.53));parent_keep(lidparts,pivot)
    animate(pivot,'chest_open',31,0,math.radians(-105))
    for x in [-.44,.44]:
        for z in [.20,.45]:gem('Rivet',(x,-.39,z),(.018,.012,.018),'gold')
    o=prism('Lock plate',[(-.10,.49),(-.10,.32),(0,.24),(.10,.32),(.10,.49)],.025,'gold');o.location.y=-.39
    # Original hammer-and-anvil badge.
    o=prism('Anvil badge',[(-.07,.36),(.07,.36),(.045,.335),(.027,.335),(.024,.31),(-.024,.31),(-.027,.335),(-.045,.335)],.012,'iron',.003);o.location.y=-.414
    beam('Hammer handle',(-.025,-.428,.37),(.025,-.428,.43),.008,'iron',4)
    o=box('Hammer head',(.024,-.429,.43),(.055,.018,.022),'iron',.004);o.rotation_euler.y=-.6
    return {'type':'prop','animations':[{'name':'chest_open','frames':31,'fps':30,'loop':False,'root_motion':False,'impact_frame':None}],'origin':'base_center','notes':['LidPivot hinges on rear edge; clip opens 105 degrees.','Hammer and anvil badge is original.']}

def orb():
    clear();cyl('Stone plinth',(0,0,.065),.29,.13,'stone',12);cyl('Plinth rim',(0,0,.14),.31,.04,'gold',12)
    gem('Floating arcane crystal',(0,0,.51),(.22,.22,.26),'dark')
    moving=[]
    for i,rot in enumerate([(math.pi/2,0,0),(math.pi/3,.7,.6),(.3,.4,0)]):
        moving.append(ring('Armillary ring '+str(i),(0,0,.51),.29+.025*i,.016,'gold',rot,32))
    for i in range(6):
        a=i*math.tau/6;gem('Plinth rune',(.26*math.cos(a),.26*math.sin(a),.18),(.025,.025,.042),'dark')
    root=empty('ArmillaryPivot',(0,0,.51));parent_keep(moving,root);animate(root,'orb_idle',121)
    return {'type':'prop','animations':[{'name':'orb_idle','frames':121,'fps':30,'loop':True,'root_motion':False,'impact_frame':None}],'origin':'base_center','notes':['Crystal and pedestal stay fixed while armillary rotates.']}

def ingot():
    clear();o=box('Hammered iron billet',(0,0,.10),(.48,.22,.18),'iron',.025)
    for v in o.data.vertices:v.co+=Vector((random.uniform(-.012,.012),random.uniform(-.008,.008),random.uniform(-.007,.007)))
    for i in range(7):
        o=box('Scale scar',(random.uniform(-.19,.19),random.uniform(-.07,.07),.191),(.035,.018,.003),'stone',.003);o.rotation_euler.z=random.uniform(-1,1)
    return {'type':'prop','animations':[],'origin':'base_center','notes':['Unenchanted iron with painted oxidation and hammered surface; no emissive material.']}

def aura(style):
    clear();el='galaxy' if style=='rainbow' else style
    ring('GroundRing',(0,0,.015),.40,.006,el,segments=32)
    root=empty('OrbitRoot')
    particles=[]
    for i in range(16):
        a=i*math.tau/16;r=.37+.035*math.sin(i*3);z=.13+(i%6)*.17;sw=list(IDX)[8+i%7] if style=='rainbow' else el
        p=(r*math.cos(a),r*math.sin(a),z)
        if style=='sakura':
            o=prism('Petal',[(0,-.035),(-.022,.002),(-.01,.032),(0,.023),(.01,.032),(.022,.002)],.004,el,.001);o.location=p;o.rotation_euler=(.4,a,.2)
        elif style in ['fire','ice']:
            o=gem('Flame' if style=='fire' else 'IceShard',p,(.012,.012,.06 if style=='fire' else .035),el)
        elif style=='thunder':
            o=prism('Lightning',[(-.02,.045),(.012,.012),(-.005,.012),(.02,-.04),(-.014,-.006),(.002,-.006)],.004,el,.001);o.location=p;o.rotation_euler.z=a
        else:o=gem('Star' if style=='galaxy' else 'Spark',p,(.014,.014,.022),sw)
        particles.append(o)
    parent_keep(particles,root);animate(root,'aura_'+style+'_idle',121)
    # Backs face +Y in Blender; exported glTF front is +Z.
    ring('BackHalo',(0,.10,1.12),.20,.008,el,(math.pi/2,0,0),32)
    if style in ['holy','fire','rainbow']:
        for s in [-1,1]:
            for i in range(4):beam('WingRay',(s*.09,.11,1.05+i*.025),(s*(.23+i*.06),.11,1.36+i*.035),.007,el,4)
    elif style=='dark':
        for r in [.24,.29]:ring('VoidOrbit',(0,.11,1.12),r,.006,el,(math.pi/2,.15,0),24)
    elif style=='galaxy':ring('StellarOrbit',(0,.11,1.12),.29,.005,el,(1.0,.4,.3),32)
    return {'type':'vfx_mesh','animations':[{'name':'aura_'+style+'_idle','frames':121,'fps':30,'loop':True,'root_motion':False,'impact_frame':None}],'origin':'base_center','notes':['Mesh-based aura, no engine-specific particle dependency.','Emission is embedded. Bloom is optional runtime post-processing.','GroundRing, BackHalo and OrbitRoot are separate nodes for grade visibility.']}

def apply_geometry(meta):
    scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
    meshes=[o for o in scene.objects if o.type=='MESH']
    for o in meshes:
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
        # Local normals are explicitly recalculated for mirrored polygon outlines.
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    # Uniform scale and origin convention. Existing weapon grip is centered at 0.
    points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    low=min(p.z for p in points);high=max(p.z for p in points)
    scale=meta.get('target_length',high-low)/(high-low)
    offset=0 if meta['type']=='weapon' else -low
    roots=[o for o in scene.objects if not o.parent]
    for o in roots:
        o.location*=scale;o.location.z+=offset*scale;o.scale*=scale
    bpy.context.view_layer.update()
    # Atlas projection per component, major face plane; pad each swatch to avoid mip bleed.
    for o in meshes:
        mesh=o.data;uv=mesh.uv_layers.new(name='UVMap') if not mesh.uv_layers else mesh.uv_layers.active
        coords=np.array([v.co[:] for v in mesh.vertices]);mins=coords.min(axis=0);extent=np.maximum(coords.max(axis=0)-mins,1e-6)
        cell=int(o['swatch']);cx=cell%4;cy=cell//4
        for f in mesh.polygons:
            axis=max(range(3),key=lambda j:abs(f.normal[j]));axes=[j for j in range(3) if j!=axis]
            for li in f.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co
                u=(co[axes[0]]-mins[axes[0]])/extent[axes[0]];v=(co[axes[1]]-mins[axes[1]])/extent[axes[1]]
                uv.data[li].uv=((cx+.02+.96*u)/4,(cy+.02+.96*v)/4)
        mesh.materials.clear();mesh.materials.append(MAT)
        for f in mesh.polygons:f.material_index=0
    return meshes

def render(folder,meshes):
    scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    lo=Vector(tuple(min(p[j] for p in points) for j in range(3)));hi=Vector(tuple(max(p[j] for p in points) for j in range(3)))
    center=(lo+hi)/2;size=max(hi-lo)
    for power,p,col in [(210,(-2,-3,4),(1,.83,.63)),(280,(2,1,3),(.48,.68,1)),(95,(1,-3,1.5),(1,1,1))]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(p));o=bpy.context.object;o.data.energy=power;o.data.size=3;o.data.color=col;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=size*1.28
    scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=32;scene.render.film_transparent=True
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.world.color=(.15,.15,.15);scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-.25
    for name,delta in [('front',(0,-3,0)),('34',(1.25,-3,.65))]:
        cam.location=center+Vector(delta)*size;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(folder/('preview_'+name+'.png'));bpy.ops.render.render(write_still=True)
    return [list(lo),list(hi)]

def deliver(name,meta):
    folder=ROOT/name;folder.mkdir(exist_ok=True);meshes=apply_geometry(meta)
    tris=0
    for o in meshes:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    limit=5000 if meta['type']=='weapon' else 15000
    assert tris<=limit,(name,tris,limit)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(folder/(name+'.glb')),export_format='GLB',export_yup=True,export_animations=True,export_frame_range=True,export_force_sampling=True,export_apply=False,export_extras=False,export_image_format='AUTO',export_materials='EXPORT')
    bounds=render(folder,meshes)
    spec={'asset':name,**meta,'units':'meters','up_axis':'+Y','front_axis':'+Z','weapon_blade_axis':'+Y' if meta['type']=='weapon' else None,'polygon_metric':'triangles','polygon_count':tris,'polygon_limit':limit,'material_count':1,'textures':{'basecolor':[1024,1024],'normal':[1024,1024],'roughness_metallic_packed':[1024,1024],'emissive':[1024,1024]},'textures_embedded':True,'bones':[],'fps':30,'bounds_blender_z_up_m':bounds,'known_issues':[]}
    (folder/'spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8')
    print('DELIVERED '+name+' '+str(tris),flush=True)

jobs=[('weapon-chest',chest),('aura-orb',orb),('iron-ingot-0',ingot)]
for style in ['fire','ice','thunder','dark','holy','sakura','galaxy','rainbow']:jobs.append(('aura-'+style,lambda s=style:aura(s)))
for kind in ['sword','dagger','spear','axe','saber','shinai','scythe']:
    for tier in range(1,5):jobs.append((kind+'-t'+str(tier),lambda k=kind,t=tier:weapon(k,t)))
only=sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else None
for name,fn in jobs:
    if not only or name==only:deliver(name,fn())
print('COMPLETE',flush=True)
