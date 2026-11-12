"""Render an orthographic diagnostic of model geometry and the live route graph."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[2] / 'route-audit'
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
for path in root.glob('floor-[1-4].json'):
    data = json.loads(path.read_text(encoding='utf-8'))
    image = Image.new('RGB', (1800,1200), '#fffef0')
    draw = ImageDraw.Draw(image)
    lo,hi = min(t['h'] for t in data['triangles']),max(t['h'] for t in data['triangles'])
    for tri in data['triangles']:
        level = (tri['h']-lo)/(hi-lo)
        shade = int(235-level*95)
        color = tuple(int(int(tri['color'][i:i+2],16)*.55+255*.45) for i in (1,3,5)) if tri['color'] != '#ffffff' else (shade,shade,shade)
        draw.polygon([(x*2,y*2) for x,y in tri['p']],fill=color)
    image.save(path.with_name(path.stem+'-model.png'))
    # Rasterize the topmost surface at plan-unit resolution. Only the model's
    # corridor material is walkable; roofs, atriums and tenant rooms are excluded.
    mask = Image.new('L', (900,600), 0)
    md = ImageDraw.Draw(mask)
    for tri in data['triangles']:
        md.polygon([tuple(p) for p in tri['p']],fill=255 if tri['color']=='#d9d5e2' else 0)
    rows = []
    for y in range(600):
        spans=[]; start=None
        for x in range(901):
            ok=x<900 and mask.getpixel((x,y))>0
            if ok and start is None: start=x
            if not ok and start is not None: spans.append([start,x-1]);start=None
        rows.append(spans)
    path.with_name(path.stem+'-walkable.json').write_text(json.dumps(rows,separators=(',',':')))
    if '--planned' in sys.argv:
        plan=next(p for p in json.loads((root/'verified-plan.json').read_text(encoding='utf-8')) if p['floor']==data['floor']['number'])
        data['graph']={'nodes':plan['moves']+[{'id':str(p),'x':p[0],'y':p[1],'type':'ROUTE_POINT'} for p in plan['points']],
                       'edges':[{'fromNodeId':str(a),'toNodeId':str(b)} for a,b in plan['edges']]}
    nodes = {n['id']:n for n in data['graph']['nodes']}
    for edge in data['graph']['edges']:
        a,b = nodes.get(edge['fromNodeId']),nodes.get(edge['toNodeId'])
        if a and b:
            draw.line((a['x']*2,a['y']*2,b['x']*2,b['y']*2),fill='#0080ff',width=2)
    for n in nodes.values():
        x,y = n['x']*2,n['y']*2
        color = '#ee0000' if n['type']=='STORE_ANCHOR' else '#0066cc'
        draw.ellipse((x-3,y-3,x+3,y+3),fill=color)
        if n['type']!='ROUTE_POINT': draw.text((x+4,y+3),n.get('name') or n['type'],font=font,fill=color)
    image.save(path.with_name(path.stem+('-planned' if '--planned' in sys.argv else '')+'.png'))
