import sys, json, re, subprocess, shutil, os
work, pdf, pub = sys.argv[1], sys.argv[2], sys.argv[3]
items = json.load(open(f'{work}/doors.json'))
G = {
 'Binnendeuren · stijldeuren': dict(
  desc='Stijldeur uit het binnendeurenprogramma van Eko-Okna (productie Erkado). Opgebouwd uit MDF-stijlen en -dorpels met HDF-panelen of glas, leverbaar als opdek- en stompe deur.',
  feat=['opdek of stomp (verdekte scharnieren)', 'verticale en horizontale MDF-stijlen, bekleed met decorfolie of CPL', 'HDF-panelen van 4 mm in hetzelfde decor', 'ook als dubbele deur en als schuifdeur leverbaar'],
  tech=['3 verstelbare scharnieren (opdek) of 3 verdekte scharnieren (stomp)', 'opdek: insteekslot · stomp: magneetslot — sleutel, cilinder of wc-sluiting', 'glas: 4 mm gehard, mat of helder; gelaagd VSG 22.1 tegen meerprijs', 'opties: ventilatierooster of onderkier, valdorpel, scharnierkapjes in kleur']),
 'Binnendeuren · gelakt': dict(
  desc='Gelakte binnendeur uit het programma van Eko-Okna (productie Erkado). Deur en kozijn zijn afgewerkt met UV-geharde watergedragen lak: strak, egaal wit en goed bestand tegen dagelijks gebruik.',
  feat=['afwerking: UV-geharde lak, kleur White Titanium', 'opdek, stomp of — afhankelijk van het model — omkeerbaar', 'MDF-constructie met gefreesde of vlakke HDF-panelen', 'ook als dubbele deur en als schuifdeur leverbaar'],
  tech=['3 verstelbare scharnieren (opdek) of 3 verdekte scharnieren (stomp)', 'opdek: insteekslot · stomp: magneetslot — sleutel, cilinder of wc-sluiting', 'glasmodellen: gehard glas, gelaagd of mat glas tegen meerprijs', 'opties: ventilatie-onderkier, valdorpel, zwart magneetslot']),
 'Binnendeuren · vlakke deuren': dict(
  desc='Vlakke binnendeur uit het programma van Eko-Okna (productie Erkado). Houten raamwerk met twee HDF-platen en een stabiliserende vulling; leverbaar als opdek-, stompe of omkeerbare deur.',
  feat=['opdek, stomp of omkeerbaar', 'houten raamwerk met twee HDF-platen', 'honingraatvulling; volspaanvulling tegen meerprijs', 'deurkant in decorkleur of in strak zwart (optie)'],
  tech=['3 verstelbare scharnieren (opdek) of verdekte scharnieren (stomp / omkeerbaar)', 'insteekslot of magneetslot — sleutel, cilinder of wc-sluiting', 'glasmodellen: gelaagd en gehard veiligheidsglas VSG/ESG', 'opties: ventilatie-onderkier, valdorpel, zwart magneetslot']),
}
FIN = {'GREKO':'Greko-folie','PREMIUM':'Premium-folie','CPL':'ST CPL-laminaat','UV-lak':'UV-lak'}
cat = [i for i in json.load(open(f'{pub}/catalog.json')) if not i['id'].startswith('eko-deur-')]
n=0
for it in items:
    g = G[it['group']]
    b = subprocess.run(['pdftotext','-f',str(it['page']+1),'-l',str(it['page']+1),'-layout',pdf,'-'],capture_output=True,text=True).stdout
    labels = it.get('labels')
    if labels and '/' not in it['name']:
        nm = it['name'].upper()
        nums = sorted({int(x) for x in re.findall(r'\b'+re.escape(nm)+r' (\d+)\b', b)})
        if nums == list(range(1, len(labels)+1)): labels = [f"{it['name']} {k}" for k in nums]
    fins = [FIN[f] for f in it['fin']]
    feat = list(g['feat'])
    if fins: feat.append('afwerking: ' + ', '.join(fins))
    if labels: feat.append(f'{len(labels)} modellen in deze collectie')
    o = dict(id=it['id'], brand='Eko-Okna', cat='binnen', group=it['group'], name=it['name'], page=it['page'], tagline='', descPL='', descNL=g['desc'],
             features=feat, tech=g['tech'], nl=False, url='', net=None, gross=None, flags={'flush':True,'double':True,'sliding':True,'vent':True}, constr=[], equip=[], equip2=[], frame=[], notes=[], opts=[],
             coats=it['coats'], widths=it['widths'] or [60,100], dir=it['dir'])
    for k in ('scene','strip'):
        if k in it: o[k]=it[k]
    if labels: o['labels']=labels
    dst = f"{pub}/eko/{it['id']}"; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(f"{work}/out/{it['id']}", dst)
    cat.append(o); n+=1
    print(o['id'], labels[:3] if labels else None, len(o['coats']))
json.dump(cat, open(f'{pub}/catalog.json','w'), ensure_ascii=False)
print(n, len(cat))
