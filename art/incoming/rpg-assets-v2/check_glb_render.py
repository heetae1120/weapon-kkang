import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(__file__).resolve().parent/'qa'
OUT.mkdir(exist_ok=True)
for name,frame in [('weapon-chest',1),('weapon-chest',16),('weapon-chest',31),('aura-orb',61),('dagger-t4',1)]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str(ROOT/name/(name+'.glb')))
    scene.frame_set(frame);bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in scene.objects if o.type=='MESH' for v in o.data.vertices]
    lo=Vector(tuple(min(p[j] for p in points) for j in range(3)));hi=Vector(tuple(max(p[j] for p in points) for j in range(3)));center=(lo+hi)/2;size=max(hi-lo)
    bpy.ops.object.camera_add(location=center+Vector((1.25,-3,.65))*size);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.3;scene.camera=cam
    for power,p,col in [(210,(-2,-3,4),(1,.83,.63)),(280,(2,1,3),(.48,.68,1)),(95,(1,-3,1.5),(1,1,1))]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(p));o=bpy.context.object;o.data.energy=power;o.data.size=3;o.data.color=col;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=24;scene.render.film_transparent=True
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.file_format='PNG'
    scene.world.color=(.15,.15,.15);scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-.25
    scene.render.filepath=str(OUT/(name+'-'+str(frame)+'.png'));bpy.ops.render.render(write_still=True)
print('GLB reimport renders complete')
