from PIL import Image,ImageDraw
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
sheet=Image.new('RGB',(1024,7*282),'#152238');draw=ImageDraw.Draw(sheet)
for row,folder in enumerate(sorted(ROOT.glob('*-combat'))):
    frames=sorted((folder/'motion-frames').glob('*.png'));images=[Image.open(p).convert('RGB') for p in frames]
    images[0].save(folder/'finisher-preview.gif',save_all=True,append_images=images[1:],duration=[70 if i%3!=1 else 60 for i in range(len(images))],loop=0,optimize=True)
    spec=json.loads((folder/'spec.json').read_text());c=spec['animations'][-1]
    indexes=[0,(c['impact_frame']-4)//2,(c['impact_frame']-1)//2,min(len(images)-1,(c['impact_frame']+5)//2)]
    for col,i in enumerate(indexes):
        sheet.paste(images[i],(col*256,row*282));draw.text((col*256+5,row*282+258),folder.name.replace('-combat','')+' / F'+frames[i].stem,fill='white')
sheet.save(ROOT/'reimport-contact-sheet.jpg',quality=90)
report=json.loads((ROOT/'reimport-validation.json').read_text())
print('max joint gap',max(c['joint_gap_m'] for r in report for c in r['clips']))
print('max foot drift',max(c['foot_drift_m'] for r in report for c in r['clips']))
print('max quaternion step',max(c['max_world_rotation_step_degrees'] for r in report for c in r['clips']))
