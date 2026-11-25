import sys; sys.path.insert(0, sys.argv[4])
from c3lib import *
mini, work, pub = sys.argv[1:4]
cat = json.load(open(f'{pub}/catalog.json')); by = {c['id']:c for c in cat}
def base(id_, name, c, group, desc, feat):
    o = by.get(id_) or dict(id=id_, brand='Eko-Okna', page=0, tagline='', descPL='', tech=[], nl=False, url='', net=None, gross=None, flags={}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[], coats=[], widths=None, dir=f'fabriek/eko/{id_}')
    o.update(name=name, cat=c, group=group, descNL=desc, features=feat)
    if id_ not in by: cat.append(o); by[id_]=o
    return o
R=(280,400); Rh=(290,400)
SPEC = [
 ('eko-rolluiken-voorzet','Voorzetrolluiken','zonwering','Rolluiken','Rolluiken die vóór het kozijn op de gevel of in de dagkant worden gemonteerd. Geschikt voor bestaande woningen: het kozijn blijft onaangeroerd.',
  ['kast in 45°, rechthoekig of rond','aluminium lamellen met PU-schuim','bediening met band, slinger of motor','SAR: inbraakwerende uitvoering','optioneel met geïntegreerde hor'], {208:['SK 45','SK 45 Railing','SK 90'],209:['SKO-P','SKP','SAR']}, R, Rh),
 ('eko-rolluiken-opbouw','Opbouwrolluiken','zonwering','Rolluiken','Rolluiken met een kast die bovenop het kozijn staat en samen met het raam wordt geplaatst. De kast valt weg in de gevel of achter de afwerking; de keuze voor nieuwbouw en kozijnvervanging.',
  ['geïsoleerde kast op het kozijn','revisie van binnen of van onderen','geschikt voor kunststof, aluminium en houten ramen','met hor en met screens te combineren','motor en smart-home-bediening mogelijk'],
  {210:['Expert XT','Elite XT','Exakt'],211:['Opoterm','Cleverbox','Cleverbox Soft'],212:['Exte Neo XT','Roka-Top 2','Roka-Top 2 EX'],213:['Roka-Top 2 Plus','Roka-Top 2 RG','Roka-Top 2 RG EX'],214:['SKB Styroterm','Quadbox','SP-E']}, R, Rh),
 ('eko-rolluiken-inbouw','Inbouwrolluiken en screens','zonwering','Rolluiken','Rolluiken die in de latei of spouw worden weggewerkt, en doekscreens die de zon buiten houden en het zicht behouden.',
  ['SDZ en SKN: kast in de latei, onzichtbaar in de gevel','Screen en Heroal VS Z: doek in zip-geleiding, windvast','bediening met motor, afstandsbediening of app'], {215:['SDZ','SKN','Screen'],216:['Heroal VS Z']}, R, Rh),
 ('eko-buitenjaloezieen','Buitenjaloezieën','zonwering','Geveljaloezieën','Buitenjaloezieën met kantelbare aluminium lamellen: je regelt daglicht en inkijk traploos en houdt de warmte buiten. Als voorzet-, opbouw- of inbouwsysteem.',
  ['lamellen in C-, Z- of S-vorm','lichtregeling door kantelen','kast voorzet, opbouw of in de gevel','motorbediening, zon- en windsensor mogelijk'], {216:[None,'Basic','RAFF-I'],217:['RAFF-E','SKB','SKEF'],218:['Roka Top 2 Shadow','Clever Box','Elite XT']}, R, Rh),
 ('eko-binnenzonwering','Binnenzonwering: plissé, rolgordijn en lamellen','zonwering','Binnenzonwering','Raamdecoratie voor binnen: plisségordijnen die je van boven en van onder kunt bedienen, cassette-rolgordijnen en verticale lamellen.',
  ['Vegas Plisse en Plisse Duo','cassette-rolgordijn B5 en B50/B55','verticale lamellen Bahama','montage op het raam, zonder boren mogelijk'], {234:['Vegas Plisse','Vegas Plisse Duo'],235:['B5','B50/B55','Bahama Vertical']}, (200,400), (300,400)),
 ('eko-garage-infiniti','Sectionaaldeuren Infiniti X, F en R','garage','Sectionale garagedeuren','Sectionale garagedeuren in drie veersystemen: X met trekveren, F met torsieveren aan de voorzijde en R met torsieveren achter. Met Infiniti Zero is ook renovatie in een lage of smalle opening mogelijk.',
  ['panelen 40 mm met PU-kern','Infiniti X: trekveren, weinig inbouwhoogte','Infiniti F / R: torsieveren voor of achter','Infiniti Zero: renovatieset voor bestaande openingen','Infiniti Thermo: extra afdichting tegen warmteverlies'], {238:['Infiniti X','Infiniti F','Infiniti R']}, (350,420), (290,340)),
]
for id_, name, c, group, desc, feat, pages, wr, hr in SPEC:
    o = base(id_, name, c, group, desc, feat); T=[]; L=[]
    for p, names in pages.items():
        ims = tiles(mini, work, 'm', p, wr, hr)
        for k, im in enumerate(ims):
            if k < len(names) and names[k]: T.append(im); L.append(names[k])
    strip(pub, o, T, 440, L); print(id_, len(T), 'labels' in o)
def photo(p, wr, hr, idx=0):
    ims = imgs(mini, work, 'm', p, wr=wr, hr=hr); return ims[idx] if len(ims) > idx else None
o = by['eko-garage-infiniti']; im = photo(239, (500,1400), (500,1400)); 
if im: put(pub, o, im, 'scene')
o = base('eko-garage-openslaand','Openslaande garagedeuren Presto en Unico','garage','Openslaande garagedeuren','Openslaande garagedeuren met twee vleugels op stalen profielen. Presto zonder thermische onderbreking voor schuur en berging, Unico geïsoleerd met sectionaalpanelen van 40 mm.',['twee vleugels, symmetrisch of asymmetrisch','Presto: koud profiel','Unico: thermisch onderbroken profiel, panelen 40 mm','loopdeur zonder dat de hele deur open hoeft','in RAL-kleur naar keuze'])
im = photo(242, (700,900), (450,560)); 
if im: put(pub, o, im, 'scene')
for id_, name, p, desc in (('eko-hekwerk-staal','Stalen hekwerk en poorten',251,'Stalen hekwerken met bijpassende draai- en schuifpoorten, thermisch verzinkt en gepoedercoat.'),('eko-hekwerk-aluminium','Aluminium hekwerk en poorten',252,'Aluminium hekwerken met bijpassende draai- en schuifpoorten: licht, roestvrij en onderhoudsarm.')):
    o = base(id_, name, 'garage', 'Hekwerk en poorten', desc, ['hekpanelen, loopdeur, draaipoort en schuifpoort in één ontwerp','verzinkt en gepoedercoat in RAL-kleur','aandrijving, fotocellen en intercom als optie'])
    T = tiles(mini, work, 'm', p, (360,410), (140,150)); names = re.findall(r'([A-Z]{3,}) EK\.20\.\d+', text(mini, p)); names=[n.title() for n in names]
    strip(pub, o, T, 260, names if len(names)==len(T) else None); print(id_, len(T), len(names), 'labels' in o)
for id_, name, p, desc, feat in (('eko-pergola-nuun-eco','Pergola Nuun Eco',260,'Bioklimatische pergola met kantelbare aluminium lamellen: zon, schaduw of een dicht dak met één druk op de knop.',['kantelbare lamellen 0–110°','geïntegreerde waterafvoer in de staanders','vrijstaand of aan de gevel','led-verlichting, screens en glazen schuifwanden als optie']),('eko-pergola-selt-sb350','Pergola Selt SB350',261,'Bioklimatische pergola voor grote overspanningen, met kantelbare lamellen en volledig weg te werken techniek.',['kantelbare lamellen 0–120°','grote overspanning zonder tussenstaander','waterafvoer in de constructie','screens, verlichting en verwarming als optie'])):
    o = base(id_, name, 'zonwering', "Pergola's", desc, feat); im = photo(p, (650,800), (330,400))
    if im: put(pub, o, im, 'scene')
    print(id_, 'scene' in o)
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False); print(len(cat))
