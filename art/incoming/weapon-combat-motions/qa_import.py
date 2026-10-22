"""Reimport delivered GLBs and validate actual bone motion and render finishers."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT));from build import stage,render
report=[]
for folder in sorted(ROOT.glob('*-combat')):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    scene=bpy.context.scene;scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str(folder/(folder.name+'.glb')))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    for t in rig.animation_data.nla_tracks:t.mute=True
    spec=json.loads((folder/'spec.json').read_text(encoding='utf8'))
    metrics=[]
    for c in spec['animations']:
        action=next(a for a in bpy.data.actions if c['name'] in a.name);rig.animation_data.action=action
        worst=0;step=0;prev={};feet=[];step_at=None;slow_step=0
        for f in range(1,c['frames']+1):
            scene.frame_set(f)
            for side in ['Left','Right']:
                for parent,child in [('Arm','ForeArm'),('ForeArm','Hand'),('UpLeg','Leg'),('Leg','Foot')]:
                    p=rig.pose.bones['mixamorig:'+side+parent];b=rig.pose.bones['mixamorig:'+side+child]
                    worst=max(worst,(p.tail-b.head).length)
            for b in rig.pose.bones:
                q=b.matrix.to_quaternion()
                if b.name in prev:
                    angle=math.degrees(prev[b.name].rotation_difference(q).angle)
                    angle=min(angle,360-angle)
                    if angle>step:step=angle;step_at=[b.name,f]
                    if c['impact_frame'] is None or not c['impact_frame']-3<=f<=c['impact_frame']+1:slow_step=max(slow_step,angle)
                prev[b.name]=q
            feet.append([tuple(rig.pose.bones['mixamorig:'+s+'Foot'].head) for s in ['Left','Right']])
        drift=max((Vector(a)-Vector(b)).length for ff in feet for a,b in zip(ff,feet[0]))
        # Quaternion double-cover: exporter may flip sign, so modulo 360 degrees.
        metrics.append(dict(clip=c['name'],joint_gap_m=worst,foot_drift_m=drift,max_world_rotation_step_degrees=step,max_step_bone_and_frame=step_at,max_non_strike_step_degrees=slow_step))
        assert worst<.001,(c['name'],worst)
        assert drift<.001,(c['name'],drift)
    if '--metrics-only' in sys.argv:
        report.append(dict(asset=folder.name,clips=metrics,passed=True));continue
    cam=stage();scene.cycles.samples=8;scene.render.resolution_percentage=50
    c=spec['animations'][-1];rig.animation_data.action=next(a for a in bpy.data.actions if c['name'] in a.name)
    out=folder/'motion-frames';out.mkdir(exist_ok=True)
    # Sample full 30fps motion every second frame: 15fps review, no retiming.
    for f in list(range(1,c['frames']+1,2)):
        scene.frame_set(f);render(cam,out/('%03d.png'%f),.64)
    report.append(dict(asset=folder.name,clips=metrics,passed=True))
(ROOT/'reimport-validation.json').write_text(json.dumps(report,indent=2))
print('REIMPORT VALIDATED',len(report))
