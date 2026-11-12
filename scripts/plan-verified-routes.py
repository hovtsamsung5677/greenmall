"""Build a reviewable graph constrained to the actual GLB corridor surfaces.

Entrances below are corridor-side approach points matched to the supplied 2GIS
plans. GLBs have simplified tenant boundaries; this does not certify real doors.
"""
import json, heapq, math
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]/'route-audit'
POSITIONS={
1:{
'GLORIA JEANS':(420,300),'Пятёрочка':(145,375),'5Post':(149,375),
"O'STIN":(204,393),'ЯХОНТ':(110,382),'Тимка':(52,390),'МегаФон | Yota':(157,400),
'BEFREE':(265,393),'Зоомаркет':(114,405),'Katrin':(138,405),'For you':(205,477),
'ELITA':(331,413),'Бургер Кинг':(54,445),'Uvenco':(200,500),'ЛЭТУАЛЬ':(251,420),
'VendShop':(173,505),'Good lucky':(200,505),'Ещё':(473,325),'X-MAN':(368,393),
'ПОДРУЖКА':(546,393),'М.Косметик':(686,362),'Студия наращивания волос':(620,410),
'Горячие слойки':(650,435),'POLARIS':(386,413),'SOKOLOV':(462,480),'Додо Пицца':(426,475),
'ROMANTIC':(544,423),'Улыбка радуги':(676,445),'Зодиак':(607,488),'Аптека Эконом':(647,488),
'МАГНИТ':(725,350),'Комфортный уголок':(755,364),'Усадьба':(807,365),'Автобусная касса':(800,380),
'Little Tokyo Bubble Tea':(693,435),"O'juvi parfum":(748,460),'МТС':(748,475),'Банк ВТБ':(791,465),
'9:41':(697,481),'АКВАРЕЛЬКА':(748,501),'Студия шаров Пати декор':(704,507),
'ArtGold':(641,400),'Hohoro coffee':(736,495),
'Лифт 1':(316,390),'Лифт 2':(774,400),'Эскалатор 1':(494,350),'Эскалатор 2':(738,485),
'Эскалатор 3':(760,445),'Стойка':(719,488),'Вход':(724,517),'Туалет':(621,340)},
2:{
'Спортмастер':(172,455),'Zolla':(224,410),'Читай-город':(273,397),'Askona':(395,355),
'Cleopatra':(187,489),'Kseniya Rikalina':(245,468),'Kari Kids':(440,305),'Kari Гипер':(520,305),
'Мясной':(410,421),'Ателье':(632,330),'Колибри':(668,360),'Мажор':(710,371),
'МажорКа':(800,371),'Метрология':(862,384),'Мажор Kids':(862,410),'BomBitta Room':(862,460),
'Artphoto':(676,450),'Феличита':(668,475),'Shopaholic':(745,495),'Svoboda':(865,497),
'Лифт 1':(336,390),'Лифт 2':(835,430),'Эскалатор 1':(470,370),
'Эскалатор 2':(710,385),'Эскалатор 3':(820,385),'Эскалатор 4':(705,487)},
3:{
'Аркадный автомат':(322,215),'Super 8':(322,260),'Аэрохоккей':(580,215),'Fun kids':(655,336),
'Студия английского языка':(310,515),'Ак Барс-мед':(440,515),'VR.Нереальное место':(660,515),
'Лифт 2':(585,325),'Эскалатор 4':(319,450),'Лестница':(570,512)},
4:{
'Студия красоты':(565,112),'Парикмахерская':(605,112),'Антэк':(724,280),'ПСК Каркас':(724,340),
'Наша столица':(724,380),'Эверия Лайф':(724,440),'СпецСтрой':(485,485),'Фиеста':(700,485),
'Лифт 2':(629,302),'Лестница':(610,482)}
}
SPINES={
1:[[(25,400),(450,400),(720,400),(800,375)],[(450,215),(450,500)],
   [(150,400),(155,450),(200,495),(255,400)],[(720,400),(720,500)],[(605,488),(675,488),(720,500),(748,501)]],
2:[[(185,480),(225,440),(250,410),(410,410),(430,330),(530,330)],[(225,440),(285,480),(285,515)],
   [(680,380),(850,380),(850,490),(680,490),(680,380)],[(632,330),(676,345),(680,380)]],
3:[[(285,200),(285,495),(615,495),(615,200)]],
4:[[(230,45),(230,465),(680,465),(680,90),(555,90)]]}

def build(number):
    data=json.loads((ROOT/f'floor-{number}.json').read_text(encoding='utf-8'))
    rows=json.loads((ROOT/f'floor-{number}-walkable.json').read_text())
    walk={(x,y) for y,spans in enumerate(rows) for a,b in spans for x in range(a,b+1)}
    def snap(p):
        if p in walk:return p
        return min(walk,key=lambda q:(q[0]-p[0])**2+(q[1]-p[1])**2)
    # Clearance penalty discourages hugging walls. No smoothing across obstacles.
    def cost(p):
        for radius in (2,4,7,10):
            if any((p[0]+dx,p[1]+dy) not in walk for dx,dy in [(radius,0),(-radius,0),(0,radius),(0,-radius)]):
                return 1+12/radius
        return 1
    costs={}
    def route(start,goals):
        target=list(goals)
        def h(p):return min(abs(p[0]-q[0])+abs(p[1]-q[1]) for q in target) if len(target)<30 else 0
        heap=[(h(start),0,start)]; distances={start:0}; prev={}
        while heap:
            _,g,p=heapq.heappop(heap)
            if g!=distances[p]:continue
            if p in goals:
                path=[p]
                while p in prev:p=prev[p];path.append(p)
                return path[::-1]
            for q in ((p[0]+1,p[1]),(p[0]-1,p[1]),(p[0],p[1]+1),(p[0],p[1]-1)):
                if q not in walk:continue
                if q not in costs:costs[q]=cost(q)
                ng=g+costs[q]
                if ng<distances.get(q,math.inf):
                    distances[q]=ng;prev[q]=p;heapq.heappush(heap,(ng+h(q),ng,q))
        raise ValueError(f'No corridor path from {start} to {target[:3]}')
    links=set(); network={'WEST':set(),'EAST':set()}
    def block(p):return 'EAST' if number==2 and p[0]>600 else 'WEST'
    def add(path):
        for a,b in zip(path,path[1:]):links.add(tuple(sorted((a,b))))
        network[block(path[0])].update(path)
    for spine in SPINES[number]:
        for a,b in zip(spine,spine[1:]):add(route(snap(a),{snap(b)}))
    moves=[];disabled=[]
    stairs1=iter([(200,447),(490,500),(780,510)])
    for n in data['graph']['nodes']:
        if n['type']=='ROUTE_POINT':continue
        if 'Эвакуационная лестница' in (n.get('name') or ''):
            disabled.append(n['id']);continue
        name=(n.get('name') or '').removeprefix('Вход: ')
        position=next(stairs1) if number==1 and n['type']=='STAIRS' else POSITIONS[number].get(name)
        if position is None:raise ValueError(f'Unreviewed destination {number}: {name}')
        p=snap(position)
        if math.dist(p,position)>12:raise ValueError(f'Entrance too far from corridor: {name} {position} -> {p}')
        moves.append({'id':n['id'],'name':n['name'],'type':n['type'],'mapObjectId':n.get('mapObjectId'),'x':p[0],'y':p[1]})
        add(route(p,network[block(p)]))
    # Simplify degree-two chains only when the complete replacement segment stays
    # on corridor surfaces. Junctions and destination approaches remain vertices.
    adj={}
    for a,b in links:adj.setdefault(a,set()).add(b);adj.setdefault(b,set()).add(a)
    terminals={(n['x'],n['y']) for n in moves}
    keep={p for p,ns in adj.items() if len(ns)!=2 or p in terminals}
    def visible(a,b):
        steps=max(abs(b[0]-a[0]),abs(b[1]-a[1]))*4
        return all((math.floor(a[0]+(b[0]-a[0])*t/steps+.5),math.floor(a[1]+(b[1]-a[1])*t/steps+.5)) in walk for t in range(steps+1)) if steps else True
    edges=set()
    visited=set()
    for p in keep:
        for q in adj[p]:
            if tuple(sorted((p,q))) in visited:continue
            prev=p;path=[p,q];visited.add(tuple(sorted((p,q))))
            while q not in keep:
                nxt=next(r for r in adj[q] if r!=prev);visited.add(tuple(sorted((q,nxt))));prev,q=q,nxt;path.append(q)
            index=0
            while index<len(path)-1:
                last=next(j for j in range(len(path)-1,index,-1) if visible(path[index],path[j]))
                edges.add(tuple(sorted((path[index],path[last]))));index=last
    keep={p for e in edges for p in e}
    for a,b in edges:
        assert visible(a,b)
    result={'floor':number,'floorId':data['floor']['id'],'moves':moves,'disabled':disabled,
            'points':[list(p) for p in sorted(keep)],'edges':[[list(a),list(b)] for a,b in sorted(edges)]}
    print(f'Floor {number}: {len(moves)} destinations, {len(keep)} points, {len(edges)} edges; every segment in corridor')
    return result

if __name__=='__main__':
    plans=[build(n) for n in range(1,5)]
    (ROOT/'verified-plan.json').write_text(json.dumps(plans,ensure_ascii=False,indent=2),encoding='utf-8')
