import sys, re, json, os, subprocess, xml.etree.ElementTree as ET
from PIL import Image, ImageFilter
prod, doors, porta, work, pub = sys.argv[1:6]
PDF = dict(pr=prod, dr=doors, po=porta)
_R = {}
def boxes(tag, p):
    d = f'{work}/m{tag}{p}'; os.makedirs(d, exist_ok=True)
    if not os.path.exists(f'{d}/p.xml'): subprocess.run(['pdftohtml','-xml','-f',str(p),'-l',str(p),'-q',PDF[tag],f'{d}/p'],capture_output=True)
    pg = ET.parse(f'{d}/p.xml').getroot().find('page'); out=[]
    for i in pg.findall('image'):
        t,l,w,h = (int(float(i.get(k))) for k in ('top','left','width','height'))
        if w<0: l+=w; w=-w
        if h<0: t+=h; h=-h
        out.append((t,l,w,h))
    return out
def crop(tag, p, b, pad=0):
    if (tag,p) not in _R:
        subprocess.run(['pdftoppm','-r','216','-f',str(p),'-l',str(p),'-png','-singlefile',PDF[tag],f'{work}/m{tag}r{p}'],capture_output=True)
        _R[(tag,p)] = Image.open(f'{work}/m{tag}r{p}.png').convert('RGB')
    im=_R[(tag,p)]; t,l,w,h=b
    return im.crop((max(0,(l-pad)*2), max(0,(t-pad)*2), min(im.width,(l+w+pad)*2), min(im.height,(t+h+pad)*2)))
def cluster(bs, gap):
    bs = sorted(bs, key=lambda b:(round(b[0]/120), b[1])); out=[]
    for b in bs:
        if out:
            t,l,w,h = out[-1]
            if b[1] <= l+w+gap and abs(b[0]-t) < 120:
                nt=min(t,b[0]); nl=min(l,b[1]); out[-1]=(nt,nl,max(l+w,b[1]+b[2])-nl,max(t+h,b[0]+b[3])-nt); continue
        out.append(b)
    return out
def base(id_, name, cat, group, desc, feat):
    return dict(id=id_, brand='Eko-Okna', cat=cat, group=group, name=name, page=0, tagline='', descPL='', descNL=desc, features=feat, tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
def strip(o, tiles, H):
    tiles = [t.resize((max(1,round(t.width*H/t.height)), H), Image.LANCZOS) for t in tiles]
    gap=4; W=sum(t.width for t in tiles)+gap*(len(tiles)-1); st=Image.new('RGB',(W,H),'white'); x=0; pos=[]
    for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+gap
    d=f"{pub}/eko/{o['id']}"; os.makedirs(d, exist_ok=True); st.save(f'{d}/strip.jpg', quality=88); o['strip']=dict(w=W,h=H,items=pos)
def scene(o, im, key='scene'):
    d=f"{pub}/eko/{o['id']}"; os.makedirs(d, exist_ok=True)
    if im.width>1800: im=im.resize((1800, round(im.height*1800/im.width)), Image.LANCZOS)
    im.save(f'{d}/{key}.jpg', quality=88); o[key]=[im.width, im.height]
new=[]
o=base('eko-naturo-76','Naturo 76','ramen','Ramen · hout','Houten raamsysteem met een inbouwdiepte van 76 mm. Gelamineerd hout in vier lagen, afgewerkt met duurzame lak; optioneel met aluminium bekleding aan de buitenzijde.',['inbouwdiepte 76 mm','vierlaags gelamineerd hout','drievoudige beglazing mogelijk','optie: aluminium buitenbekleding','kruk en beslag in meerdere kleuren'])
scene(o, crop('pr',16,(156,0,895,553))); new.append(o)
o=base('eko-raamgrepen','Raamgrepen','beslag','Beslag · ramen','Raamgrepen voor kunststof, aluminium en houten ramen, in meerdere modellen en kleuren. Ook afsluitbaar met sleutel of drukknop.',['modellen o.a. Roto, Kwadro, New York, Dublin, Victory, Atlanta','kleuren: wit, zilver, antraciet/zwart, rvs-look','afsluitbaar met sleutel of drukknop (Secustik)'])
strip(o, [crop('pr',19,b,4) for b in cluster([b for b in boxes('pr',19) if 30<=b[2]<=110 and 100<=b[3]<=175 and b[1]>1000], 20)], 320); new.append(o)
o=base('eko-deurgrepen-buiten','Deurkrukken en greepstangen voor buitendeuren','beslag','Beslag · buitendeuren','Krukgarnituren en greepstangen voor kunststof, aluminium en stalen buitendeuren. Greepstangen in rvs, recht of gebogen, in lengtes van 30 tot 180 cm.',['krukgarnituur op langschild of rozet','greepstangen P1–P45: recht, gebogen of met houtinleg','rvs geborsteld, zwart of in RAL-kleur','trekker, vaste knop of kruk-kruk'])
bs=[b for b in boxes('pr',36) if 30<=b[2]<=130 and 125<=b[3]<=400]
strip(o, [crop('pr',36,b,6) for b in sorted(bs, key=lambda b:(b[1]>890, round(b[0]/150), b[1]))], 360); new.append(o)
o=base('eko-dorpels-scharnieren','Dorpels, scharnieren, deurdrangers en toegangscontrole','beslag','Beslag · buitendeuren','Toebehoren voor buitendeuren: lage aluminium en composiet dorpels, drempelloze magneetdorpel, opleg-, verdekte en rolscharnieren, deurdrangers en elektronische toegangscontrole.',['aluminium dorpel met thermische onderbreking','composiet dorpel','magnetische nuldorpel (rolstoeltoegankelijk)','opleg-, rol- of verdekte scharnieren','deurdrangers met of zonder vastzetting','toegangscontrole: vingerscan, codeklavier, kaartlezer'])
strip(o, [crop('pr',37,b) for b in sorted({b for b in boxes('pr',37) if b[2]>=300 and b[3]>=240}, key=lambda b:(b[1]>890, b[0]))], 420); new.append(o)
o=base('eko-garage-segment','Sectionaaldeuren Infiniti Quiet / Safe / Premium','garage','Sectionale garagedeuren','Sectionaaldeuren van verzinkte staalpanelen met PU-kern. Leverbaar in drie uitrustingsniveaus: Quiet (stille loop), Safe (extra beveiliging) en Premium. Panelen in elke RAL-kleur of houtdecor.',['panelen 40 mm met polyurethaanschuim','profilering: lamellen, cassettes of vlak; glad of woodgrain','beglazingen, rvs-decoraties (Torino, Firenze, Verona)','loopdeur in de garagedeur mogelijk','aluminium sectie met beglazing als optie','aandrijving met afstandsbediening en app'])
scene(o, crop('pr',47,(157,0,896,554))); strip(o, [crop('pr',48,b) for b in sorted({b for b in boxes('pr',48) if b[2]>=300 and b[3]>=300}, key=lambda b:(b[1]>890, b[0]))][:1] + [crop('pr',48,b) for b in sorted({b for b in boxes('pr',48) if b[2]>=300 and b[3]>=300}, key=lambda b:(b[1]>890, b[0]))][3:], 420); new.append(o)
o=base('eko-kleurenpalet','Kleurenpalet ramen en deuren','ramen','Ramen · kleuren en opties','Kleuren en decors voor kunststof, aluminium en houten kozijnen. Kunststof in tientallen folies, aluminium in elke RAL-kleur en structuurlak, hout in dekkende en transparante lakken.',['kunststof: houtdecors en effen folies, binnen en buiten verschillend mogelijk','aluminium: RAL, structuurlak en houtdecor','hout: transparante lazuur of dekkende RAL-lak','de staaltjes zijn indicatief; kies de kleur aan de hand van een echt monster'])
strip(o, [crop('pr',20,b) for b in sorted([b for b in boxes('pr',20) if 85<=b[2]<=105 and 80<=b[3]<=105], key=lambda b:(b[1]>890, round(b[0]/50), b[1]))], 200); new.append(o)
o=base('eko-deur-decors','Decors en kleuren binnendeuren','binnen','Binnendeuren · decors','Alle decors voor de binnendeuren en kozijnen: Greko- en Premium-folies, ST CPL-laminaat met AntiFinger-coating en UV-lak.',['Greko: houtdecors met voelbare structuur','Premium: synchroonporie, zeer natuurgetrouw','ST CPL: extra slijt- en krasvast, deels met AntiFinger','UV-lak: White Titanium','de staaltjes zijn indicatief'])
strip(o, [crop('dr',6,b) for b in sorted([b for b in boxes('dr',6) if 40<=b[2]<=140 and 20<=b[3]<=140 and b[2]*b[3]>1200], key=lambda b:(round(b[0]/25), b[1]))], 160); new.append(o)
o=base('eko-kronen-pilasters','Kronen en pilasters','kozijn','Kozijnen · binnendeuren','Klassieke kozijnafwerking: een kroonlijst boven de deur en pilasters met sokkel langs de stijlen. Past op de verstelbare kozijnen uit het programma.',['kroonlijst in twee profielen (P en Z)','pilasters met sokkel','in alle deurdecors en gelakt'])
strip(o, [crop('dr',96,b) for b in sorted([b for b in boxes('dr',96) if b[2]>=200 and b[3]>=180], key=lambda b:(b[0],b[1]))], 420); new.append(o)
o=base('eko-deur-opties','Deuropties: vulling, ventilatie en scharnierkapjes','beslag','Beslag · binnendeuren','Opties voor de binnendeuren: honingraat-, tubespaan- of volspaanvulling, ventilatiekokers of -rooster, onderkier voor wtw-ventilatie en afdekkapjes voor scharnieren.',['vulling: honingraat, tubespaan of volspaan','ventilatiekokers kunststof of metaal, rond of vierkant','ventilatierooster of onderkier','scharnierkapjes: nikkel, patina, chroom, messing, wit, zwart','valdorpel'])
strip(o, [crop('dr',92,b) for b in sorted([b for b in boxes('dr',92) if b[2]>=150 and b[3]>=90], key=lambda b:(round(b[0]/60),b[1]))], 300); new.append(o)
cat=json.load(open(f'{pub}/catalog.json')); ids={o['id'] for o in new}|{'porta-kleuren'}
cat=[c for c in cat if c['id'] not in ids]
# Porta colour samples: the three sample pages as they are printed
po=dict(id='porta-kleuren', brand='Porta', cat='binnen', group='Binnendeuren · decors', name='Porta kleurstalen', page=182, tagline='', descPL='', descNL='Kleurstalen uit de Porta-catalogus: acrylverf, Portasynchro 3D, Portaperfect 3D, CPL HQ en natuurfineer.', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir='fabriek/porta/porta-kleuren')
tiles=[]
for p in (182,183,184):
    subprocess.run(['pdftoppm','-r','110','-f',str(p),'-l',str(p),'-png','-singlefile',porta,f'{work}/mpo{p}'],capture_output=True); tiles.append(Image.open(f'{work}/mpo{p}.png').convert('RGB'))
H=900; tiles=[t.resize((round(t.width*H/t.height),H), Image.LANCZOS) for t in tiles]; W=sum(t.width for t in tiles)+8; st=Image.new('RGB',(W,H),'white'); x=0; pos=[]
for t in tiles: st.paste(t,(x,0)); pos.append([x,t.width]); x+=t.width+4
os.makedirs(f'{pub}/porta/porta-kleuren', exist_ok=True); st.save(f'{pub}/porta/porta-kleuren/strip.jpg', quality=85); po['strip']=dict(w=W,h=H,items=pos); po['labels']=['Acryl / 3D-folie','CPL HQ','Natuurfineer']
cat += new + [po]
for o in new: print(o['id'], 'scene' in o, len(o['strip']['items']) if 'strip' in o else 0)
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
