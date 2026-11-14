from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math, random

random.seed(20361111)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / 'assets' / 'images' / 'space-invaders'
OUT = ASSET_ROOT
for folder in ('ships', 'backgrounds'):
    (OUT / folder).mkdir(parents=True, exist_ok=True)

INK = '#090b0e'
HULL = '#252b31'
MID = '#414b53'
LIGHT = '#858c8d'
EDGE = '#b3b1a5'
RED = '#a72d36'
RED_L = '#ed4d48'
AMBER = '#bf7935'
CYAN = '#56bac0'

def px(v, scale):
    return int(round(v * scale))

def poly(draw, points, fill, outline=INK, width=1, scale=1):
    pts = [(px(x, scale), px(y, scale)) for x, y in points]
    draw.polygon(pts, fill=fill)
    if outline:
        draw.line(pts + [pts[0]], fill=outline, width=max(1, px(width, scale)), joint='curve')

def sym(draw, right, fill, outline=INK, scale=1):
    points = right + [(64-x, y) for x, y in reversed(right[:-1])]
    poly(draw, points, fill, outline, 1, scale)

def rect(draw, box, fill, outline=None, scale=1):
    b = tuple(px(v, scale) for v in box)
    draw.rectangle(b, fill=fill, outline=outline, width=1 if outline else 0)

def ellipse(draw, box, fill, outline=None, scale=1, width=1):
    b = tuple(px(v, scale) for v in box)
    draw.ellipse(b, fill=fill, outline=outline, width=max(1,px(width,scale)))

def panel(draw, box, scale=1, color=MID):
    x1,y1,x2,y2=box
    rect(draw,box,INK,scale=scale)
    rect(draw,(x1+1,y1+1,x2-1,y2-1),color,scale=scale)
    rect(draw,(x1+2,y1+2,x2-2,y2-2),HULL,scale=scale)
    rect(draw,(x1+2,y1+2,x2-3,y1+3),LIGHT,scale=scale)

def ship(name, boss=False):
    s=128 if boss else 64
    q=s/64
    im=Image.new('RGBA',(s,s),(0,0,0,0)); d=ImageDraw.Draw(im)
    silhouettes={
      'player':[(32,2),(38,16),(61,30),(56,38),(40,33),(37,50),(32,54),(27,50),(24,33),(8,38),(3,30),(26,16)],
      'scout':[(32,4),(38,25),(56,40),(46,44),(40,48),(37,59),(32,53),(27,59),(24,48),(18,44),(8,40),(26,25)],
      'interceptor':[(32,3),(39,27),(61,47),(48,51),(40,43),(37,61),(32,56),(27,61),(24,43),(16,51),(3,47),(25,27)],
      'tank':[(32,5),(39,19),(45,20),(48,27),(61,34),(60,47),(49,48),(44,58),(37,55),(32,61),(27,55),(20,58),(15,48),(4,47),(3,34),(16,27),(19,20),(25,19)],
      'bomber':[(32,4),(38,24),(44,28),(57,25),(61,40),(51,46),(43,43),(38,58),(32,53),(26,58),(21,43),(13,46),(3,40),(7,25),(20,28),(26,24)],
      'gunship':[(32,5),(39,20),(45,23),(47,29),(61,31),(60,45),(48,48),(43,57),(36,55),(32,62),(28,55),(21,57),(16,48),(4,45),(3,31),(17,29),(19,23),(25,20)],
      'striker':[(32,3),(38,22),(59,43),(48,46),(43,41),(38,57),(32,52),(26,57),(21,41),(16,46),(5,43),(26,22)],
      'dreadnought':[(32,2),(39,10),(42,17),(51,18),(52,25),(61,28),(61,48),(54,52),(50,61),(43,58),(39,51),(35,61),(29,61),(25,51),(21,58),(14,61),(10,52),(3,48),(3,28),(12,25),(13,18),(22,17),(25,10)],
      'carrier':[(32,2),(39,12),(43,18),(60,20),(61,50),(53,54),(49,63),(39,61),(35,55),(29,55),(25,61),(15,63),(11,54),(3,50),(4,20),(21,18),(25,12)],
      'leviathan':[(32,1),(37,12),(42,17),(46,29),(60,36),(57,44),(50,43),(47,57),(41,61),(36,54),(32,63),(28,54),(23,61),(17,57),(14,43),(7,44),(4,36),(18,29),(22,17),(27,12)]
    }
    poly(d,silhouettes[name],INK,INK,1,q)
    # layered armor plates and recognizably different wing profiles
    if name == 'player':
        sym(d,[(32,4),(38,18),(58,32),(52,38),(40,34),(36,44)],LIGHT,INK,q)
        sym(d,[(32,10),(36,22),(53,32),(47,37),(36,34)],HULL,INK,q)
        sym(d,[(32,24),(26,34),(12,36),(24,38)],MID,INK,q)
        sym(d,[(32,32),(26,38),(18,39),(25,41)],LIGHT,INK,q)
    elif name in ('scout','striker','interceptor'):
        sym(d,[(32,6),(36,27),(54 if name!='striker' else 57,41),(45,42),(37,34),(34,22)],MID,INK,q)
        sym(d,[(32,15),(34,29),(51 if name!='striker' else 53,40),(43,39),(36,34)],HULL,INK,q)
        sym(d,[(32,28),(24,37),(13 if name=='interceptor' else 10,40),(24,41)],LIGHT,INK,q)
        sym(d,[(32,33),(26,39),(17,40),(25,42)],MID,INK,q)
    elif name in ('tank','gunship','bomber'):
        sym(d,[(32,7),(38,21),(43,25),(44,31),(57 if name=='bomber' else 59,34),(57,45),(47,46),(42,40),(36,48)],MID,INK,q)
        sym(d,[(32,14),(36,26),(41,30),(42,37),(54,37),(53,43),(44,43),(37,49)],HULL,INK,q)
        sym(d,[(32,28),(22,30),(10 if name!='bomber' else 8,33),(11,39),(23,38)],LIGHT,INK,q)
        sym(d,[(32,34),(24,36),(15,35),(14,40),(25,42)],MID,INK,q)
        # shoulder armor / weapon pods
        for x in ([6,54] if name=='bomber' else [7,54]):
            rect(d,(x,31,x+4,43),INK,scale=q);rect(d,(x+1,33,x+3,39),AMBER,scale=q)
    else:
        sym(d,[(32,4),(39,14),(42,23),(57,28),(58,48),(51,51),(47,59),(41,57),(36,48)],MID,INK,q)
        sym(d,[(32,13),(36,22),(39,29),(53,32),(54,45),(46,48),(41,55),(36,46)],HULL,INK,q)
        sym(d,[(32,25),(24,30),(11,31),(10,46),(19,49),(24,42)],LIGHT,INK,q)
        sym(d,[(32,32),(23,36),(14,35),(14,43),(23,45)],MID,INK,q)
        # fortress turrets and port-side armor
        for x in (5,54):
            rect(d,(x,31,x+5,47),INK,scale=q);rect(d,(x+1,34,x+4,43),MID,scale=q)
            rect(d,(x+2,32,x+3,36),RED,scale=q)
    # central keel
    poly(d,[(32,10),(36,29),(35,47),(32,54),(29,47),(28,29)],MID,INK,1,q)
    poly(d,[(32,18),(34,31),(33,44),(31,44),(30,31)],LIGHT,INK,1,q)
    panel(d,(29,27,35,36),q,CYAN if name in ('player','scout','interceptor') else RED)
    rect(d,(30,40,34,43),AMBER,scale=q)
    # hot engine vents at the tail
    for x in (25,37):
        rect(d,(x,52,x+2,59),INK,scale=q);rect(d,(x,55,x+2,58),AMBER,scale=q)
    # small serial lights and panel seams
    for x in (13,48):
        rect(d,(x,39,x+2,41),RED_L,scale=q)
    if name in ('dreadnought','carrier','leviathan'):
        # command bridge and side battery details
        panel(d,(27,18,37,27),q,CYAN if name=='carrier' else RED)
        for x in (7,54):
            for y in (37,42,47): rect(d,(x,y,x+2,y+2),AMBER,scale=q)
        if name=='carrier':
            for x in (13,45):
                rect(d,(x,23,x+7,46),INK,scale=q);rect(d,(x+1,25,x+6,44),LIGHT,scale=q)
                rect(d,(x+2,29,x+5,42),MID,scale=q)
        elif name=='leviathan':
            for y in (29,35,41,47):
                rect(d,(29,y,35,y+2),RED_L if y==41 else AMBER,scale=q)
    return im.resize((s*2,s*2),Image.Resampling.NEAREST)

for n in ('player','scout','interceptor','tank','bomber','gunship','striker','dreadnought','carrier','leviathan'):
    ship(n,n in ('dreadnought','carrier','leviathan')).save(OUT/'ships'/f'SpaceInvaders-sprite-{n}.png', optimize=True)

def meteor_atlas():
    atlas=Image.new('RGBA',(256,128),(0,0,0,0))
    shapes=[[(15,2),(23,5),(29,13),(26,23),(20,29),(9,27),(3,19),(5,9)],
      [(13,1),(22,4),(27,10),(30,19),(22,28),(12,29),(4,22),(2,12),(7,5)],
      [(15,2),(25,5),(27,14),(29,22),(19,29),(8,26),(3,17),(7,7)],
      [(11,3),(21,2),(29,10),(25,20),(28,25),(18,29),(7,25),(3,16),(5,8)],
      [(16,2),(25,7),(28,17),(23,26),(15,29),(5,24),(3,14),(8,5)],
      [(10,2),(19,4),(28,9),(26,19),(21,27),(10,29),(3,22),(4,12)],
      [(14,1),(22,6),(30,14),(24,25),(17,30),(8,26),(2,18),(5,8)],
      [(9,3),(19,1),(26,7),(29,17),(24,27),(14,29),(5,23),(2,13)]]
    shades=[('#292722','#4b4540','#736658'),('#26282b','#48494a','#6b6963'),('#332a24','#59453a','#87664a'),('#242629','#42464a','#696a68')]
    for i,shape in enumerate(shapes):
        cell=Image.new('RGBA',(32,32),(0,0,0,0));d=ImageDraw.Draw(cell)
        dark,mid,light=shades[i%len(shades)]
        poly(d,shape,dark,'#111214',1)
        # angular, pixelated facets, craters and rim highlights
        poly(d,[(shape[0][0]+2,shape[0][1]+3),(shape[1][0]-2,shape[1][1]+2),(shape[3][0]-3,shape[3][1]+4),(shape[4][0]-4,shape[4][1]-3),(shape[2][0]-4,shape[2][1]+1)],mid,None)
        poly(d,[(8,10),(14,6),(19,9),(17,15),(10,16)],light,None)
        poly(d,[(17,19),(22,16),(25,19),(22,24),(17,24)],'#171819',None)
        rect(d,(7,19,10,21),light);rect(d,(20,9,23,11),mid)
        up=cell.resize((64,64),Image.Resampling.NEAREST)
        atlas.alpha_composite(up,((i%4)*64,(i//4)*64))
    atlas.save(OUT/'backgrounds'/'SpaceInvaders-meteors.png',optimize=True)
meteor_atlas()

def nebula_texture():
    w,h=256,144
    im=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(im)
    clouds=[(54,52,(86,44,49)),(117,87,(49,57,81)),(187,45,(112,64,43)),(211,105,(45,77,77)),(92,25,(65,52,84))]
    for cx,cy,color in clouds:
        for i in range(44):
            r=random.randint(8,30);dx=random.randint(-34,34);dy=random.randint(-19,19)
            a=random.randint(5,17)
            shade=tuple(min(255,int(c*random.uniform(.72,1.12))) for c in color)+(a,)
            d.ellipse((cx+dx-r,cy+dy-r//2,cx+dx+r,cy+dy+r//2),fill=shade)
    # streaks and broken pockets of dust; values remain subdued behind the action.
    for _ in range(210):
        x=random.randrange(w);y=random.randrange(h)
        color=random.choice([(130,76,58,18),(72,90,111,16),(117,71,95,16),(81,117,116,14)])
        d.rectangle((x,y,x+random.randrange(1,5),y+random.randrange(1,3)),fill=color)
    im=im.filter(ImageFilter.GaussianBlur(2.2))
    im.save(OUT/'backgrounds'/'SpaceInvaders-nebula.png',optimize=True)
nebula_texture()

def blackhole():
    s=192; im=Image.new('RGBA',(s,s),(0,0,0,0));d=ImageDraw.Draw(im)
    # broken accretion disk, separated pixel bands and lensing streaks
    for box,color,width in [((22,63,170,128),(105,43,38,100),9),((28,68,164,123),(178,85,43,155),6),((36,73,156,118),(93,96,109,125),4),((43,77,149,114),(215,141,66,165),2)]:
        d.ellipse(box,outline=color,width=width)
    d.ellipse((52,66,140,126),fill=(4,5,8,238),outline=(185,79,49,205),width=3)
    d.ellipse((63,72,129,119),fill=(0,0,2,250))
    for i in range(31):
        a=random.random()*math.tau
        x=96+math.cos(a)*random.uniform(65,94);y=96+math.sin(a)*random.uniform(16,38)
        length=random.randint(2,9); col=random.choice([(189,91,49,115),(107,153,163,105),(218,164,91,128)])
        d.line((int(x),int(y),int(x+math.cos(a)*length),int(y+math.sin(a)*length*.35)),fill=col,width=random.choice([1,2]))
    d.rectangle((28,89,42,90),fill=(101,160,169,85));d.rectangle((148,99,165,100),fill=(167,92,56,95))
    im.save(OUT/'backgrounds'/'SpaceInvaders-black-hole.png',optimize=True)
blackhole()

print('Generated transparent pixel-art sprites, meteors, nebula and black hole.')
