"""Blender 4.1, original Mixamo-compatible animation training rig.
Outputs only beside this source. No game sources modified.
Run blender -b --factory-startup --python build.py [-- --only sword]
"""
import bpy, math, json, sys, shutil
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler
ROOT=Path(__file__).resolve().parent
INCOMING=ROOT.parent
PREFIX='mixamorig:'
KINDS=['sword','dagger','spear','axe','saber','shinai','scythe']
TWO={'spear','axe','scythe','shinai'}
LEFT_GRIP={'spear':.20,'scythe':.20,'axe':-.095,'shinai':-.10}
def V(p): return Vector((p[0],-p[2],p[1]))
def J(v): return [v.x,v.z,-v.y]
def Q(pitch=0,roll=0,yaw=0): return Euler(tuple(math.radians(x) for x in (pitch,roll,yaw)),'XYZ').to_quaternion()
def mat(q,p): return Matrix.Translation(p) @ q.to_matrix().to_4x4()
def aim(a,b,up=Vector((0,0,1))):
    y=(b-a).normalized();z=up-y*up.dot(y)
    if z.length<.01:z=Vector((0,1,0))-y*y.y
    z.normalize();x=y.cross(z).normalized();z=x.cross(y)
    return Matrix((x,y,z)).transposed().to_quaternion()
def ik(a,b,l1,l2,pole):
    d=b-a;dist=d.length;d.normalize();c=min(max(dist,.025),l1+l2-.002)
    h=(l1*l1-l2*l2+c*c)/(2*c);r=math.sqrt(max(0,l1*l1-h*h))
    n=pole-a-d*(pole-a).dot(d);n.normalize()
    return a+d*h+n*r, abs(dist-c)

def skeleton():
    bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='WK_TrainingRig'
    bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
    defs={}
    def b(n,a,z,parent=None):
        eb=rig.data.edit_bones.new(PREFIX+n);eb.head=V(a);eb.tail=V(z);eb.align_roll(Vector((0,0,1)))
        if parent:eb.parent=rig.data.edit_bones[PREFIX+parent]
        defs[n]=(V(a),V(z),parent)
    b('Hips',(0,.88,0),(0,1,0))
    b('Spine',(0,1,0),(0,1.13,0),'Hips')
    b('Spine1',(0,1.13,0),(0,1.25,0),'Spine')
    b('Spine2',(0,1.25,0),(0,1.42,0),'Spine1')
    b('Neck',(0,1.42,0),(0,1.49,0),'Spine2')
    b('Head',(0,1.49,0),(0,1.67,0),'Neck')
    for side,s in [('Left',1),('Right',-1)]:
        b(side+'Shoulder',(s*.035,1.39,0),(s*.17,1.39,0),'Spine2')
        b(side+'Arm',(s*.17,1.39,0),(s*.42,1.39,0),side+'Shoulder')
        b(side+'ForeArm',(s*.42,1.39,0),(s*.65,1.39,0),side+'Arm')
        b(side+'Hand',(s*.65,1.39,0),(s*.74,1.39,0),side+'ForeArm')
        b(side+'UpLeg',(s*.095,.86,0),(s*.095,.46,0),'Hips')
        b(side+'Leg',(s*.095,.46,0),(s*.095,.08,0),side+'UpLeg')
        b(side+'Foot',(s*.095,.08,0),(s*.095,.055,.14),side+'Leg')
        b(side+'ToeBase',(s*.095,.055,.14),(s*.095,.055,.21),side+'Foot')
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
    return rig,defs

def material():
    m=bpy.data.materials.new('Painted_training_automaton');m.use_nodes=True
    nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
    for name in ['basecolor','normal','orm']:
        path=ROOT/(name+'.png')
        if not path.exists():shutil.copyfile(INCOMING/'rpg-assets-v2'/(name+'.png'),path)
        im=bpy.data.images.load(str(path));im.pack();im.colorspace_settings.name='sRGB' if name=='basecolor' else 'Non-Color'
        n=nodes.new('ShaderNodeTexImage');n.image=im
        if name=='basecolor':links.new(n.outputs['Color'],p.inputs['Base Color'])
        elif name=='normal':
            t=nodes.new('ShaderNodeNormalMap');t.inputs['Strength'].default_value=.45;links.new(n.outputs['Color'],t.inputs['Color']);links.new(t.outputs['Normal'],p.inputs['Normal'])
        else:
            t=nodes.new('ShaderNodeSeparateColor');links.new(n.outputs['Color'],t.inputs['Color']);links.new(t.outputs['Green'],p.inputs['Roughness']);links.new(t.outputs['Blue'],p.inputs['Metallic'])
    return m

def mannequin(rig,defs,m):
    parts=[]
    def finish(o,bone,tile):
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        o.data.materials.clear();o.data.materials.append(m)
        uv=o.data.uv_layers.active or o.data.uv_layers.new()
        for poly in o.data.polygons:
            for k,li in enumerate(poly.loop_indices):
                corners=[(.08,.08),(.92,.08),(.92,.92),(.08,.92)]
                u,v=corners[k%4];uv.data[li].uv=((tile%4+u)/4,(tile//4+v)/4)
        vg=o.vertex_groups.new(name=PREFIX+bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');parts.append(o)
    def ell(bone,p,scale,tile):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=p);o=bpy.context.object;o.scale=scale;finish(o,bone,tile)
    for n,(a,b,parent) in defs.items():
        if 'Toe' in n or 'Shoulder' in n:continue
        delta=b-a
        if n=='Hips':ell(n,V((0,.91,0)),(.145,.09,.095),7)
        elif n in ['Spine','Spine1','Spine2']:
            i=['Spine','Spine1','Spine2'].index(n);ell(n,(a+b)/2,(.12+i*.025,.082+i*.008,delta.length*.65),4)
        elif n=='Head':
            ell(n,V((0,1.59,.006)),(.103,.09,.11),5)
            for s in [-1,1]:ell(n,V((s*.04,1.61,.087)),(.022,.012,.012),6)
            ell(n,V((0,1.555,.085)),(.04,.01,.012),7)
        elif n=='Neck':ell(n,(a+b)/2,(.042,.042,.046),2)
        elif 'Hand' in n:
            s=1 if n.startswith('Left') else -1
            ell(n,a+Vector((s*.046,0,0)),(.052,.037,.031),5)
            # Thumb on forward edge; fingers are sculpted closed mittens, no finger bones.
            ell(n,a+Vector((s*.030,-.031,-.006)),(.027,.016,.019),2)
            for j in range(3):ell(n,a+Vector((s*.075,(j-1)*.020,-.005)),(.016,.012,.027),5)
        elif 'Foot' in n:ell(n,a+V((0,-.028,.05)),(.062,.11,.052),7)
        else:
            r=.062 if 'UpLeg' in n else (.047 if 'Leg' in n else .045)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=(a+b)/2)
            o=bpy.context.object;o.scale=(r,r,delta.length*.46);o.rotation_mode='QUATERNION';o.rotation_quaternion=delta.to_track_quat('Z','Y');finish(o,n,4)
            ell(n,a,(r*1.1,)*3,2)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='WK_TrainingMannequin'
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    mod=body.modifiers.new('Skin','ARMATURE');mod.object=rig;body.parent=rig
    for p in body.data.polygons:p.use_smooth=True
    return body

# Pose parameters: grip XYZ (Y-up), pitch/roll/weapon yaw, torso yaw, crouch, lean.
READY={
 'sword':[-.20,1.12,.22,25,-20,0,-12,.045,0],
 'dagger':[-.30,1.20,.18,65,-50,0,-22,.08,5],
 'spear':[-.13,1.11,.19,67,-12,0,-25,.065,3],
 'axe':[-.10,1.13,.17,10,-28,0,-18,.06,0],
 'saber':[-.25,1.12,.20,28,-35,0,-18,.055,0],
 'shinai':[-.07,1.13,.23,30,-5,0,-5,.06,0],
 'scythe':[-.16,1.13,.13,15,-30,0,-25,.07,0]}
def p(x,y,z,pitch,roll=0,wyaw=0,yaw=0,drop=.06,lean=0):return [x,y,z,pitch,roll,wyaw,yaw,drop,lean]
def clips(kind):
    r=READY[kind]
    def clip(name,n,wind,hit,follow,ref=None):
        # Long anticipation, two-frame fast strike, held follow-through, smooth recovery.
        w=round(n*.36);h=w+3;f=h+5
        return dict(name=kind+'_'+name,frames=n,impact_frame=h,loop=False,
            keys=[(1,r),(w,wind),(h,hit),(f,follow),(n-10,follow),(n,r)],reference=ref)
    a=clip('diagonal',37,p(-.20,1.48,.10,-38,-35,yaw=-25),p(-.05,1.16,.33,80,30,yaw=15,drop=.11),p(.04,1.05,.24,112,55,yaw=26,drop=.10))
    b=clip('sweep',41,p(-.32,1.22,.08,40,-70,yaw=-40),p(-.06,1.22,.34,65,70,yaw=18),p(.12,1.23,.18,40,100,yaw=38))
    c=clip('thrust',35,p(-.17,1.23,.10,90,0,yaw=-25),p(-.04,1.27,.39,90,0,yaw=0,drop=.09),p(-.04,1.27,.37,90,0,yaw=4,drop=.08))
    if kind in ['sword','saber']:
        d=clip('crescent_finisher',67,p(-.08,1.56,.04,-55,-5,yaw=-12,drop=.10),p(-.07,1.19,.35,85,0,yaw=5,drop=.15,lean=10),p(-.07,1.04,.27,120,0,yaw=10,drop=.12,lean=8),'BLEACH / Getsuga Tensho: overhead cut and projected crescent')
    elif kind in ['dagger','shinai']:
        d=clip('flash_finisher',61,p(-.26,1.08,.08,78,-85,yaw=-32,drop=.22,lean=15),p(-.06,1.26,.34,60,80,yaw=22,drop=.14,lean=12),p(.14,1.30,.17,45,105,yaw=32,drop=.10,lean=6), 'Demon Slayer / Thunderclap and Flash' if kind=='shinai' else 'ONE PIECE / Ittoryu Iai Shishi Sonson (short-blade adaptation)')
    elif kind=='spear':
        a=clip('rising',39,p(-.15,1.04,.19,115,-20,yaw=-20,drop=.12),p(-.06,1.30,.32,40,12,yaw=15),p(-.04,1.43,.18,-15,25,yaw=20))
        d=clip('flash_finisher',65,p(-.15,1.20,.05,90,-5,yaw=-35,drop=.20,lean=12),p(-.03,1.29,.37,88,0,yaw=0,drop=.12,lean=12),p(-.02,1.32,.35,80,0,yaw=8,drop=.10,lean=7),'Thunderclap and Flash timing adapted to a two-handed spear lunge')
    else:
        c=clip('rising',43,p(-.13,1.04,.20,120,-30,yaw=-25,drop=.12),p(-.06,1.29,.32,35,20,yaw=15),p(.04,1.46,.13,-30,40,yaw=30))
        d=clip('crescent_finisher',73,p(-.08,1.55,.02,-65,-15,yaw=-30,drop=.12),p(-.08,1.15,.31,95,15,yaw=15,drop=.18,lean=12),p(.04,1.04,.24,125,45,yaw=30,drop=.15,lean=8),'Getsuga Tensho overhead crescent adapted to '+kind)
    return [dict(name=kind+'_idle',frames=91,loop=True,impact_frame=None,keys=[(1,r),(46,[r[i]+(.008 if i==1 else 0) for i in range(9)]),(91,r)],reference=None),a,b,c,d]

def sample(c,f):
    for (t0,p0),(t1,p1) in zip(c['keys'],c['keys'][1:]):
        if t0<=f<=t1:
            t=(f-t0)/(t1-t0);t=t*t*(3-2*t)
            return [a+(b-a)*t for a,b in zip(p0,p1)]
    return c['keys'][-1][1]

def animate(rig,defs,kind):
    allclips=clips(kind);checks=[];socket_mats=[]
    for c in allclips:
        action=bpy.data.actions.new(c['name']);rig.animation_data_create();rig.animation_data.action=action
        maxreach=0;maxgrip=0;maxcorrection=0
        for f in range(1,c['frames']+1):
            x,y,z,pitch,roll,wyaw,yaw,drop,lean=sample(c,f)
            root=V((0,.88-drop,0));yawq=Q(yaw=yaw);torsoq=yawq@Q(pitch=lean)
            def bodypt(pt):return root+torsoq@(pt-V((0,.88,0)))
            targets={}
            def setb(n,a,b,rot=None):targets[n]=mat(rot or aim(a,b),a)
            for n in ['Hips','Spine','Spine1','Spine2','Neck','Head']:
                a,b,_=defs[n];aa=bodypt(a);bb=bodypt(b);setb(n,aa,bb,torsoq@rig.data.bones[PREFIX+n].matrix_local.to_quaternion())
            wq=yawq@Q(pitch,roll,wyaw)
            grip=root+yawq@(V((x,y,z))-V((0,.88,0)))
            # The weapon center is the right palm center. Opposing palms share a rigid shaft.
            wx,wy,wz=[wq@Vector(v) for v in [(1,0,0),(0,1,0),(0,0,1)]]
            rq=Matrix((-wz,-wx,wy)).transposed().to_quaternion()
            lq=Matrix((wz,wx,wy)).transposed().to_quaternion()
            original_grip=grip.copy()
            # Project a shared rigid grip into the intersection of both arm reach spheres.
            # This moves the weapon as one object; it never stretches an arm or slides a hand.
            for iteration in range(16):
                for side,hq,off in [('Right',rq,0)]+([('Left',lq,LEFT_GRIP[kind])] if kind in TWO else []):
                    shoulder=bodypt(defs[side+'Arm'][0]);wrist=grip+wz*off-hq@Vector((0,.046,0))
                    d=wrist-shoulder
                    if d.length>.465:grip-=d.normalized()*(d.length-.465)
            maxcorrection=max(maxcorrection,(grip-original_grip).length)
            leftgrip=grip+wz*LEFT_GRIP.get(kind,0)
            for side,s in [('Right',-1),('Left',1)]:
                sh,el,_=defs[side+'Shoulder'];a=bodypt(el);setb(side+'Shoulder',bodypt(sh),a,torsoq@rig.data.bones[PREFIX+side+'Shoulder'].matrix_local.to_quaternion())
                hq=rq if s<0 else lq
                if s<0 or kind in TWO:
                    center=grip if s<0 else leftgrip;wrist=center-(hq@Vector((0,.046,0)))
                else:
                    wrist=root+yawq@(V((.25,1.16,.17))-V((0,.88,0)))
                    hq=yawq@Q(pitch=12)@rig.data.bones[PREFIX+side+'Hand'].matrix_local.to_quaternion()
                pole=root+yawq@(V((s*.55,1.05,.02))-V((0,.88,0)))
                elbow,reach=ik(a,wrist,.25,.23,pole);maxreach=max(maxreach,reach)
                # Roll follows the elbow plane, avoiding world-up singularities above the head.
                plane=(elbow-a).cross(wrist-elbow).normalized()
                setb(side+'Arm',a,elbow,aim(a,elbow,plane));setb(side+'ForeArm',elbow,wrist,aim(elbow,wrist,plane));setb(side+'Hand',wrist,wrist+hq@Vector((0,.09,0)),hq)
                if s<0 or kind in TWO:maxgrip=max(maxgrip,(wrist+hq@Vector((0,.046,0))-center).length)
            for side,s in [('Left',1),('Right',-1)]:
                hip=bodypt(defs[side+'UpLeg'][0]);foot=V((s*.155,.08,.10 if s>0 else -.10))
                knee,reach=ik(hip,foot,.40,.38,V((s*.16,.40,.65)));maxreach=max(maxreach,reach)
                setb(side+'UpLeg',hip,knee);setb(side+'Leg',knee,foot)
                for suffix in ['Foot','ToeBase']:
                    n=side+suffix;a,b,_=defs[n];q=Q(yaw=-s*8);offset=q@(a-defs[side+'Foot'][0]);setb(n,foot+offset,foot+offset+q@(b-a),q@rig.data.bones[PREFIX+n].matrix_local.to_quaternion())
            for n in defs:
                pb=rig.pose.bones[PREFIX+n];pb.rotation_mode='QUATERNION';pb.matrix=targets[n];bpy.context.view_layer.update()
                pb.keyframe_insert('location',frame=f);pb.keyframe_insert('rotation_quaternion',frame=f);pb.keyframe_insert('scale',frame=f)
            if c is allclips[0] and f==1:socket_mats=[targets['RightHand'].inverted()@mat(wq,grip)]
        for fc in action.fcurves:
            for k in fc.keyframe_points:k.interpolation='LINEAR'
        action.use_fake_user=True
        track=rig.animation_data.nla_tracks.new();track.name=c['name'];strip=track.strips.new(c['name'],1,action);track.mute=True
        checks.append(dict(clip=c['name'],max_reach_excess_m=maxreach,analytic_grip_error_m=maxgrip,authoring_reach_correction_m=maxcorrection))
    rig.animation_data.action=bpy.data.actions[allclips[0]['name']]
    return allclips,checks,socket_mats[0]

def attach_weapon(rig,kind,offset):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(INCOMING/(kind+'-t4')/(kind+'-t4.glb')))
    obs=[o for o in bpy.data.objects if o not in before];meshes=[o for o in obs if o.type=='MESH'];extras=[o for o in obs if o.type!='MESH']
    # Store original asset transforms in armature-space rest position; socket binding is baked into mesh skin.
    bpy.context.view_layer.update()
    bind=rig.data.bones[PREFIX+'RightHand'].matrix_local@offset
    for o in meshes:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=bind@world
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();weapon=bpy.context.object;weapon.name='DEMO_'+kind+'_remove_when_retargeting'
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for vg in list(weapon.vertex_groups):weapon.vertex_groups.remove(vg)
    vg=weapon.vertex_groups.new(name=PREFIX+'RightHand');vg.add(list(range(len(weapon.data.vertices))),1,'REPLACE')
    mod=weapon.modifiers.new('Weapon_socket','ARMATURE');mod.object=rig;weapon.parent=rig
    for o in extras:bpy.data.objects.remove(o,do_unlink=True)
    return weapon

def stage():
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
    bpy.ops.mesh.primitive_plane_add(size=200);plane=bpy.context.object;plane.name='STAGE'
    m=bpy.data.materials.new('Stage');m.diffuse_color=(.025,.037,.060,1);plane.data.materials.append(m)
    for pos,power,size in [((3,-4,6),550,4),((-3,-2,3),350,3),((1,3,4),700,3)]:
        bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.7;scene.camera=cam
    return cam
def render(cam,path,angle=0):
    cam.location=(3.6*math.sin(angle),-3.6*math.cos(angle),2.0);cam.rotation_euler=(Vector((0,0,1.04))-cam.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
def triangles(o):o.data.calc_loop_triangles();return len(o.data.loop_triangles)

def main(kind):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    bpy.data.orphans_purge(do_recursive=True)
    scene=bpy.context.scene;scene.render.fps=30;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    rig,defs=skeleton();body=mannequin(rig,defs,material());cc,checks,offset=animate(rig,defs,kind)
    rig.animation_data.action=None
    for pb in rig.pose.bones:pb.matrix_basis.identity()
    bpy.context.view_layer.update();weapon=attach_weapon(rig,kind,offset)
    folder=ROOT/(kind+'-combat');folder.mkdir(exist_ok=True);name=kind+'-combat'
    bpy.ops.object.select_all(action='DESELECT')
    for o in [rig,body,weapon]:o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    # Action mode exports every rig action separately. Only the chosen asset is selected.
    bpy.ops.export_scene.gltf(filepath=str(folder/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_anim_slide_to_zero=True,export_def_bones=True,export_skins=True)
    spec=dict(asset=name,type='character_animation_pack',units='meters',up_axis='+Y',front_axis='+Z',origin='feet_center',height_m=1.7,bind_pose='T-pose, palms down, thumbs forward; closed sculpted training mittens',polygon_metric='triangles',polygon_count=triangles(body)+triangles(weapon),character_polygon_count=triangles(body),demo_weapon_polygon_count=triangles(weapon),material_count=2,textures={'basecolor':[1024,1024],'normal':[1024,1024],'roughness_metallic_packed':[1024,1024]},textures_embedded=True,bones=[PREFIX+n for n in defs],max_weights_per_vertex=1,fps=30,root_motion=False,weapon_type=kind,two_handed=kind in TWO,animations=[{k:v for k,v in c.items() if k!='keys'} for c in cc],attack_pool=[dict(clip=c['name'],weight=10 if 'finisher' in c['name'] else 30) for c in cc[1:]],random_selection={'avoid_immediate_repeat':True,'select_once_per_attack':True,'game_integration_owner':'Claude'},grip={'right_bone':PREFIX+'RightHand','left_bone':PREFIX+'LeftHand' if kind in TWO else None,'left_distance_along_blade_m':LEFT_GRIP.get(kind),'socket_matrix_blender_column_major':[offset[r][c] for c in range(4) for r in range(4)],'demo_weapon':'separate rigid-skinned mesh; remove both demo meshes when retargeting'},qa=checks,known_issues=['Training mannequin has sculpted mitten hands; no individual finger animation.','Dash, slash trails, energy waves, lightning and hitstop are runtime effects; GLB contains skeletal motion only.','Retarget and game playback are Claude integration work; proportions differing from this rig require grip correction.'])
    spec['textures']['emissive']=[1024,1024]
    for c in spec['animations']:
        c['duration_seconds']=(c['frames']-1)/30
        if c['impact_frame']:
            c['impact_seconds']=(c['impact_frame']-1)/30;c['events']=[dict(frame=c['impact_frame'],type='impact',direction=[0,0,1])]
            if 'finisher' in c['name']:c['events'].append(dict(frame=c['impact_frame'],type='crescent_wave' if 'crescent' in c['name'] else 'flash_dash',direction=[0,0,1],runtime_only=True))
    (folder/'spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8')
    cam=stage();rig.animation_data.action=bpy.data.actions[cc[0]['name']];scene.frame_set(1)
    render(cam,folder/'preview_front.png');render(cam,folder/'preview_34.png',.64)
    for c in cc[1:]:
        rig.animation_data.action=bpy.data.actions[c['name']];scene.frame_set(c['impact_frame']);render(cam,folder/(c['name']+'_impact.png'),.64)
    # Save an editable source with all five actions and one active idle.
    rig.animation_data.action=bpy.data.actions[cc[0]['name']];scene.frame_set(1);scene.frame_end=91
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(name+'.blend')),compress=True)
    print('DELIVERED',kind,json.dumps(checks))

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    kinds=[args[args.index('--only')+1]] if '--only' in args else KINDS
    for k in kinds:main(k)
