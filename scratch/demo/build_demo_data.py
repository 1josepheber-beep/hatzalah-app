#!/usr/bin/env python3
"""Builds demo/demo-data.js for the Hatzalah app's demo mode.

Real lists come from the SQL files on disk (hospitals, equipment, cabinets,
jump bag items, vitals, task list, CPR buttons, apartments + markers, document
types). Everything about people is invented here. Nothing secret: door codes,
gate codes, webhook/push settings are left out or blanked.
"""
import re, json, random, datetime as dt, os
# The lists are read from the original data-load SQL (final_reload.sql, equipment_migrate.sql, cabinets_migrate.sql,
# add_jump_bag.sql, add_the_willows.sql). final_reload.sql also holds member data, so it is NOT in the repo:
# point SQL_DIR at a folder that has it (the admin keeps a copy) and run:  SQL_DIR=... OUT=demo/demo-data.js python3 build_demo_data.py
OUT=os.environ.get("OUT","/home/claude/work/demo/demo-data.js")
SQL=os.environ.get("SQL_DIR","/mnt/user-data/outputs/").rstrip("/")+"/"
random.seed(24)

# ---------- tiny SQL tuple parser ----------
def parse_values(sql, table):
    """Return (cols, rows) for the first insert into [public.]table (cols) values ... (or select * from (values ...))."""
    m=re.search(r"insert into (?:public\.)?"+table+r"\s*\(([^)]*)\)\s*(?:select \* from \(\s*)?values\s*", sql, re.I)
    if not m: return None, []
    cols=[c.strip() for c in m.group(1).split(",")]
    i=m.end(); n=len(sql); rows=[]
    def ws():
        nonlocal i
        while i<n and sql[i] in " \n\r\t": i+=1
    while True:
        ws()
        if i<n and sql[i]==",": i+=1; ws()
        if i>=n or sql[i]!="(": break
        i+=1; vals=[]
        while True:
            ws()
            if i>=n: break
            c=sql[i]
            if c==")": i+=1; break
            if c==",": i+=1; continue
            if c=="'":
                i+=1; buf=[]
                while i<n:
                    if sql[i]=="'":
                        if i+1<n and sql[i+1]=="'": buf.append("'"); i+=2; continue
                        i+=1; break
                    buf.append(sql[i]); i+=1
                vals.append("".join(buf)); continue
            j=i
            while j<n and sql[j] not in ",)": j+=1
            tok=sql[i:j].strip(); i=j
            if tok.lower()=="null": vals.append(None)
            else:
                try: vals.append(int(tok))
                except ValueError:
                    try: vals.append(float(tok))
                    except ValueError: vals.append(tok)
        rows.append(dict(zip(cols, vals)))
        ws()
        if i<n and sql[i]==";": break
    return cols, rows

def load(fname): return open(SQL+fname, encoding="utf-8").read()
final=load("final_reload.sql"); equip=load("equipment_migrate.sql"); cabs=load("cabinets_migrate.sql"); jb=load("add_jump_bag.sql"); willows=load("add_the_willows.sql")

def withids(rows, start=1):
    out=[]
    for n,r in enumerate(rows): d={"id":start+n}; d.update(r); out.append(d)
    return out

T={}
_,hosp=parse_values(final,"hospitals")
for h in hosp: h["door_code"]=""; h.pop("code",None)
for n,h in enumerate(hosp): h["order_col"]=str(n+1)
T["hospitals"]=withids(hosp)
_,vit=parse_values(final,"vitals");   T["vitals"]=withids([dict(v, order_col=str(n+1)) for n,v in enumerate(vit)])
_,tl=parse_values(final,"task_list");  T["task_list"]=withids([dict(v, order_col=str(n+1)) for n,v in enumerate(tl)])
_,cb=parse_values(final,"cpr_buttons"); T["cpr_buttons"]=withids(cb)
_,up=parse_values(final,"uploads");    T["uploads"]=withids([dict(v, order_col=str(n+1)) for n,v in enumerate(up)])
_,ap=parse_values(final,"apartments")
_,apw=parse_values(willows,"apartments")
apts=[dict(a) for a in ap if a.get("file") and a.get("name")]+[dict(a) for a in apw]
for n,a in enumerate(apts): a.setdefault("order_col",str(n+1)); a["code"]=random.choice(["#1234","#4040","#2580","*911","#7001","#3321"]); a["active"]=a.get("active") or "X"
T["apartments"]=withids(apts)
# markers: every complex's pins from the reload file, plus The Willows
markers=[]
for m in re.finditer(r"insert into apartment_markers \(file, label, x, y\) values", final):
    _,rows=parse_values(final[m.start():],"apartment_markers"); markers+=rows
_,mw=parse_values(willows,"apartment_markers"); markers+=mw
T["apartment_markers"]=withids(markers)
_,em=parse_values(equip,"equipment_meta"); T["equipment_meta"]=withids(em)
_,ei=parse_values(equip,"equipment_items"); T["equipment_items"]=withids(ei, 1200)
_,cabr=parse_values(cabs,"cabinets"); T["cabinets"]=withids(cabr)
_,cbins=parse_values(cabs,"cabinet_bins"); T["cabinet_bins"]=withids(cbins)
_,jbi=parse_values(jb,"jumpbag_items"); T["jumpbag_items"]=withids([dict(r, active="X") for r in jbi])

# ---------- tiles (current layout) ----------
tiles=[(1,"ESO PCR","link","https://www.esosuite.net/login/hohems","","clipboard","sb:tiles/mtu5i0ywftod4.jpg","X"),
 (2,"Pulsara","app","pulsara","","","sb:tiles/mtu5jsl4b57e1.jpg","X"),
 (3,"Hospitals","hospitals","","","hospital","tile-icons/tile-hospital.png","X"),
 (6,"Protocols","protocols","","","book","tile-icons/tile-protocols.png","X"),
 (4,"Equipment Finder","placement","","","grid","sb:tiles/mtt42yhsmrbww.jpg","X"),
 (7,"Gatewise","app","gatewise","","","tile-icons/gatewise.png","X"),
 (5,"Apartments Finder","apartments","","","","sb:tiles/mtt4o1d2dbcs3.jpg","X"),
 (8,"Certifications","certifications","","","","sb:tiles/mtt568t2mcmx4.jpg","X"),
 (9,"File Uploader","upload","","","","tile-icons/tile-upload.png","No"),
 (10,"Poison Control","link","tel:18002221222","","","sb:tiles/mtt4csqp256ox.jpg","X"),
 (11,"Members Directory","directory","","","","tile-icons/tile-members-directory.png","X"),
 (12,"ERG 2024","erg","","","book","sb:tiles/mtu64l84f13hn.jpg","X"),
 (13,"Scheduler","board","","","","tile-icons/tile-scheduler.png","X"),
 (14,"State Equipment","equipment","","X","check","sb:tiles/mtu6zwsrl34q1.jpg","X"),
 (15,"Task Book","taskbook","","","clipboard","tile-icons/tile-state-equipment.png","X"),
 (16,"Resources","resources","","","clipboard","sb:tiles/mtt4tyjw2g9a3.jpg","X"),
 (17,"My Jump Bag","jumpbag","","","bag","tile-icons/tile-jump-bag.png","X"),
 (18,"Ambulance Checkoff","ambcheck","","","clipboard","tile-icons/tile-ambulance-checkoff.png","X"),
 (19,"Admin","admin","","X","","sb:tiles/mtu68rwfg728i.jpg","X")]
T["tiles"]=[{"id":n+1,"order_col":str(o),"label":l,"type":t,"target":tg,"admin_only":a,"icon":ic,"image":im,"active":ac} for n,(o,l,t,tg,a,ic,im,ac) in enumerate(tiles)]

# ---------- settings (the live list, minus anything secret) ----------
S=[("Org Name","Hatzalah of Houston"),("Medical Control Number","713-555-0111"),("Medical Control Label","Call Medical Control"),("Logo URL",""),
 ("ESO PCR URL","https://www.esosuite.net/login/hohems"),("Remember Device","yes"),("Search Placeholder","Search protocols, hospitals…"),
 ("Dispatch Number","713-555-0100"),("Dispatch Label","Call Dispatch"),("Availability","on"),("Location","on"),("CPR Cycle Minutes","2"),("Guest Demo","on"),("RX Lookup","on"),
 ("Cert Reminder Days","90"),("Text Home","On"),("Text Home Message","Hi — I responded to a Hatzalah call and I'm heading out now. I'll be back as soon as I can, and I'll let you know if it runs long."),
 ("Cert Email Subject (expiring)","Reminder: your {cert} expires in {days} days — Hatzalah of Houston"),
 ("Cert Email Body (expiring)","Hi {name} ({unit}),\n\nThis is a reminder that your {cert} will expire in {days} days, on {date}. Please remember to renew it before the expiration date.\n\nTo renew it in our system: open the Hatzalah of Houston app, tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.\n\nThank you very much for your attention to this matter.\n\nSincerely,\nHatzalah of Houston Administration"),
 ("Cert Email Subject (expired)","Your {cert} has expired — Hatzalah of Houston"),
 ("Cert Email Body (expired)","Hi {name} ({unit}),\n\nYour {cert} has expired. You are not permitted to respond to medical emergencies until your certification has been renewed, is up to date, and has been updated in our system.\n\nTo renew it in our system: open the Hatzalah of Houston app, tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.\n\nSincerely,\nHatzalah of Houston Administration"),
 ("Scene Reminder Minutes","45"),("Scene Reminder Message","Scene timer still running (45+ min). Close the timer or close the app."),("Scene Timer Minutes","10"),("Scene Timer Message","Time to reassess the scene."),("Scene Timer Snooze Minutes","5"),
 ("Member Statuses","Primary, Backup, Observer, Dispatcher"),("Member Types","Responder, Non Responder, Dispatcher, Medical Control, Service Unit"),("Member Levels","EMT, AEMT, ALS, Doctor, PR"),
 ("Certifications That Block Response","State EMT/Paramedic License, American Heart BLS, Jurisprudence"),
 ("Cert Email Subject (expired, non-blocking)","Action needed: your {cert} has expired — Hatzalah of Houston"),
 ("Cert Email Body (expired, non-blocking)","Hi {name} ({unit}),\n\nYour {cert} expired on {date}. This one does not stop you responding to patients, but it is required to stay current with the organization, and some duties may depend on it.\n\nPlease renew it as soon as you can.\n\nSincerely,\nHatzalah of Houston Administration"),
 ("Cert Email Body (renewed)","Hi {name} ({unit}),\n\nThank you — your {cert} has been updated in our system and now expires {date}. No further action is needed for this one.\n\nSincerely,\nHatzalah of Houston Administration"),
 ("Cert Email Subject (renewed)","Thank you — your {cert} is up to date"),("Rule Of 9 Image","sb:misc/mu47e2ucqee6o.jpg"),("Cert Reminder Milestones","90, 60, 30, 14, 7, 3, 1"),
 ("Scene Alarm Repeats","5"),("Ambulances","A1 Ambulance - 1, A2 Ambulance - 2"),("Jump Bag Reminder Days","30, 7, 0"),("Renew Egnyte Step","off"),
 ("Storage Limit DB MB","500"),("Storage Limit Files MB","1024"),("Storage Limit Repo MB","1024"),
 ("Google Analytics ID",""),("Google Tag Manager ID",""),("Meta Pixel ID",""),("Standings Primary Minimum","15"),("Standings Backup Minimum","6"),
 ("Cert Note (coh_ambulance_permit_exp)","The permit application is in the app under Resources. Fill it in and submit it to the City of Houston before the expiration date."),
 ("Cert Note (epi_training_exp)","Renew it at EMS1 Academy: https://olt.ems1academy.com/login")]
T["settings"]=[{"id":n+1,"setting":k,"value":v} for n,(k,v) in enumerate(S)]

# ---------- people (all invented) ----------
today=dt.date(2026,11,12)
def d(days): return (today+dt.timedelta(days=days)).strftime("%-m/%-d/%Y")
P=[ # unit, first, last, type, level, status, admin, dispatcher, service, active, fto, extras
 ("H-100","Demo","Admin","Responder","ALS","Primary","X","","","X","H-102",{}),
 ("H-101","Avi","Berger","Responder","EMT","Primary","","","","X","",{}),
 ("H-102","Dovid","Friedman","Responder","ALS","Primary","X","","","X","",{"fto":"H-108, H-101"}),
 ("H-103","Yosef","Green","Responder","AEMT","Primary","","","","X","",{}),
 ("H-104","Moshe","Katz","Responder","EMT","Backup","","","","X","",{}),
 ("H-105","Eli","Stern","Responder","ALS","Primary","","","","X","",{}),
 ("H-106","Shmuel","Weiss","Responder","EMT","Primary","","","","No","",{}),
 ("H-107","Yaakov","Rosen","Responder","EMT","Backup","","","","X","",{}),
 ("H-108","Binyomin","Adler","Responder","EMT","Observer","","","","X","",{}),
 ("H-109","Nosson","Klein","Responder","ALS","Primary","","","","X","",{}),
 ("H-110","Chaim","Gold","Service Unit","PR","Primary","","","X","X","",{}),
 ("D-301","Miriam","Katz","Dispatcher","PR","Dispatcher","","X","","X","",{}),
 ("M-1","Daniel","Levi","Medical Control","Doctor","Primary","","","","X","",{}),
]
streets=["Braeswood Blvd","Chimney Rock Rd","Bissonnet St","Beechnut St","S Rice Ave","Glenmont Dr","Stella Link Rd","Willowbend Blvd","N Braeswood Blvd","Bellaire Blvd","Fondren Rd","Gessner Rd","Hillcroft Ave"]
sizes=["S","M","L","XL","XXL"]
roster=[]
for n,(u,f,l,ty,lv,st,adm,dsp,svc,act,fto,extra) in enumerate(P):
    roster.append({"id":n+1,"unit":u,"last_name":l,"first_name":f,"email":(f[0]+l).lower()+"@example.org","personal_email":(f.lower()+"."+l.lower())+"@example.com",
      "phone":"713-555-01%02d"%(n+1),"address":"%d %s, Houston, TX 770%02d"%(4100+n*137,streets[n%len(streets)],(n*7)%99),"dob":"%d/%d/%d"%(1+(n*3)%12,1+(n*5)%27,1978+(n*2)%20),
      "type":ty,"dispatcher":dsp,"service_unit":svc,"level":lv,"status":st,"fto":extra.get("fto",fto),"admin":adm,"active":act,
      "last_active":(dt.datetime(2026,11,12,7,15)-dt.timedelta(hours=n*5)).isoformat()+"Z","last_version":"1.7.2" if act=="X" else "1.5.1",
      "t_shirt_size":sizes[n%5],"polo_shirt_size":sizes[(n+1)%5],"dress_shirt_size":"16.5" if n%2 else "17","hat_size":"7 1/4","coat_size":sizes[(n+2)%5],"glove_size":["M","L","XL"][n%3],
      "emergency_contact":["Rivka","Leah","Sarah","Chana","Esther"][n%5]+" "+l,"emergency_phone":"713-555-02%02d"%(n+1),"emergency_relationship":"Spouse" if n%3 else "Parent",
      "text_home":"713-555-02%02d"%(n+1),"text_home_method":"sms" if n%2 else "whatsapp","photo":""})
T["roster"]=roster

# certifications: a mix of valid, expiring, expired, N/A
certs=[]
for n,r in enumerate(roster):
    u=r["unit"]; base=365*(1+(n%3))
    c={"id":n+1,"unit":u,"last_name":r["last_name"],"first_name":r["first_name"],
       "drivers_license_num":"TX-%07d"%(1000100+n*31),"drivers_license_exp":d(base+40*n),
       "state_emt_paramedic_license_num":"%06d"%(410000+n*17),"state_emt_paramedic_license_exp":d(base-20*n),
       "nremt_num":"E%07d"%(3200000+n*11),"nremt_exp":d(base-15*n),
       "american_heart_bls_num":"BLS-%05d"%(50000+n*7),"american_heart_bls_exp":d(200+30*n),
       "acls_num":"ACLS-%05d"%(60000+n*7) if r["level"] in ("ALS","AEMT","Doctor") else "","acls_exp":d(300+25*n) if r["level"] in ("ALS","AEMT","Doctor") else "N/A",
       "pals_num":"PALS-%05d"%(70000+n*7) if r["level"]=="ALS" else "","pals_exp":d(280+25*n) if r["level"]=="ALS" else "N/A",
       "coh_ambulance_permit_num":"COH-%05d"%(8000+n*3),"coh_ambulance_permit_exp":d(500+10*n),
       "jurisprudence_exp":d(400+20*n),"epi_training_exp":d(120+15*n),"hipaa_exp":d(250+10*n),"hipaa_awareness":d(250+10*n),
       "evoc_course":d(700),"hazmat":d(650),"blood_borne_pathogen":d(180+12*n),"administrator_of_record":"N/A","administrator_of_record_exp":"N/A","paused":""}
    if u in ("D-301","M-1","H-110"):  # non-responders carry only what applies
        for k in ("state_emt_paramedic_license_exp","nremt_exp","american_heart_bls_exp","coh_ambulance_permit_exp","jurisprudence_exp","epi_training_exp"): c[k]="N/A"
        for k in ("state_emt_paramedic_license_num","nremt_num","american_heart_bls_num","coh_ambulance_permit_num"): c[k]=""
    if u=="H-100": c["administrator_of_record"]="Yes"; c["administrator_of_record_exp"]=d(300)
    if u=="H-109": c["nremt_exp"]=d(12); c["epi_training_exp"]=d(25)          # expiring soon
    if u=="H-107": c["american_heart_bls_exp"]=d(-18); c["hipaa_exp"]=d(-40)   # expired (BLS blocks response)
    if u=="H-104": c["jurisprudence_exp"]=d(6)
    if u=="H-108": c["nremt_exp"]=d(640); c["epi_training_exp"]=""; c["coh_ambulance_permit_exp"]=""  # new member, a few blanks
    certs.append(c)
T["certifications"]=certs

iso=lambda days,h=9: (dt.datetime(2026,11,12,h,0)+dt.timedelta(days=days)).isoformat()+"Z"
T["cert_docs"]=[{"id":1,"unit":"H-100","certification":"NREMT","path":"certs/H-100/demo-nremt.pdf","expires":certs[0]["nremt_exp"],"file_name":"NREMT card.pdf","size_bytes":184320,"uploaded_by":"H-100","uploaded_at":iso(-30)},
 {"id":2,"unit":"H-102","certification":"American Heart BLS","path":"certs/H-102/demo-bls.jpg","expires":certs[2]["american_heart_bls_exp"],"file_name":"BLS card.jpg","size_bytes":402100,"uploaded_by":"H-102","uploaded_at":iso(-12)},
 {"id":3,"unit":"H-109","certification":"Driver's License","path":"certs/H-109/demo-dl.jpg","expires":certs[9]["drivers_license_exp"],"file_name":"DL.jpg","size_bytes":388000,"uploaded_by":"H-109","uploaded_at":iso(-3)}]
T["cert_updates"]=[{"id":1,"when_at":iso(-30),"unit":"H-100","certification":"NREMT","old_date":d(-20),"new_date":certs[0]["nremt_exp"]},
 {"id":2,"when_at":iso(-12),"unit":"H-102","certification":"American Heart BLS","old_date":d(-2),"new_date":certs[2]["american_heart_bls_exp"]},
 {"id":3,"when_at":iso(-3),"unit":"H-109","certification":"Driver's License","old_date":d(10),"new_date":certs[9]["drivers_license_exp"]}]
T["cert_reminders"]=[{"id":1,"when_at":iso(-1,7),"unit":"H-109","name":"Nosson Klein","certification":"NREMT","exp_date":d(12),"type":"14"},
 {"id":2,"when_at":iso(-6,7),"unit":"H-104","name":"Moshe Katz","certification":"Jurisprudence","exp_date":d(6),"type":"14"},
 {"id":3,"when_at":iso(-18,7),"unit":"H-107","name":"Yaakov Rosen","certification":"American Heart BLS","exp_date":d(-18),"type":"expired"},
 {"id":4,"when_at":iso(-1,7),"unit":"H-107","name":"Yaakov Rosen","certification":"American Heart BLS","exp_date":d(-18),"type":"expired"}]
# the schedule is filled in at run time (it has to be "now"); same for availability, jump bag statuses and checkoffs
T["schedule"]=[]; T["availability"]=[]
T["task_progress"]=[]
tasks=T["task_list"]
for n,t in enumerate(tasks[:34]):
    conf = n<18
    T["task_progress"].append({"id":n+1,"unit":"H-108","task_id":t["task_id"],"self_marked":"X","self_date":d(-60+n*2),"confirmed":"X" if conf else "","confirmed_by":"H-102" if conf else "","confirmed_date":d(-55+n*2) if conf else "","count":"","note":"" if n%9 else "Went well, reviewed with FTO."})
T["code_logs"]=[{"id":1,"saved_at":iso(-9,21),"unit":"H-105","name":"Eli Stern","mode":"adult","duration":"18:40","shocks":"2","epis":"4","cycles":"9","started":iso(-9,20),"log":"00:00 CPR started\n02:00 Rhythm check — VF, shock 1\n04:00 Epi 1\n06:00 Rhythm check — VF, shock 2\n08:00 Epi 2\n12:00 Epi 3\n16:00 Epi 4\n18:40 ROSC — transport"},
 {"id":2,"saved_at":iso(-33,14),"unit":"H-102","name":"Dovid Friedman","mode":"adult","duration":"11:05","shocks":"0","epis":"2","cycles":"5","started":iso(-33,13),"log":"00:00 CPR started\n02:00 Rhythm check — asystole\n03:30 Epi 1\n07:30 Epi 2\n11:05 Care transferred to HFD"}]
T["changes"]=[{"id":1,"when_at":iso(-2,18),"unit":"H-103","name":"Yosef Green","field":"Phone","old_value":"713-555-0199","new_value":"713-555-0104"},
 {"id":2,"when_at":iso(-5,9),"unit":"H-108","name":"Binyomin Adler","field":"Glove Size","old_value":"","new_value":"L"},
 {"id":3,"when_at":iso(-11,20),"unit":"H-101","name":"Avi Berger","field":"Text Home","old_value":"","new_value":"713-555-0202"}]
T["guests"]=[{"id":1,"passcode":"demo","name":"Demo viewer","active":"X"},{"id":2,"passcode":"visit2026","name":"Visiting organization","active":"X"}]
T["announcements"]=[
 {"id":1,"order_col":"1","kind":"feature","title":"New look for Quick Actions ⚡","body":"Tap the ⚡ at the top — the tools you need on a call are now big, colored and easy to hit with one hand: CPR Tracker at the bottom, Vitals Reference and Call Notes above it.","target":"","audience":"everyone","options":"","show_results":"","anonymous":"","show_until":d(14),"active":"X","notify":"X"},
 {"id":2,"order_col":"2","kind":"confirm","title":"Updated SOP: scene safety","body":"The scene-safety section of the SOP was updated this week. Please read it under Resources and confirm below.","target":"resources","audience":"everyone","options":"","show_results":"","anonymous":"","show_until":d(21),"active":"X","notify":""},
 {"id":3,"order_col":"3","kind":"poll","title":"Training night — which evening works?","body":"Monthly skills night is moving. Pick the evening that works best for you.","target":"","audience":"everyone","options":"Monday\nTuesday\nWednesday\nThursday","show_results":"X","anonymous":"","show_until":d(10),"active":"X","notify":""},
 {"id":4,"order_col":"4","kind":"message","title":"Welcome aboard, Binyomin","body":"Your task book is set up — your FTO is Dovid (H-102). Tap Task Book to see what's next.","target":"taskbook","audience":"unit:H-108","options":"","show_results":"","anonymous":"","show_until":d(30),"active":"X","notify":""}]
reads=[]; rid=1
for u in ["H-101","H-102","H-103","H-105","H-109"]:
    reads.append({"id":rid,"ann_id":2,"unit":u,"action":"confirmed","choice":"","at":iso(-2,10)}); rid+=1
for u,ch in [("H-101","Tuesday"),("H-102","Tuesday"),("H-103","Monday"),("H-104","Thursday"),("H-105","Tuesday"),("H-107","Wednesday"),("H-109","Tuesday")]:
    reads.append({"id":rid,"ann_id":3,"unit":u,"action":"voted","choice":ch,"at":iso(-1,20)}); rid+=1
T["announcement_reads"]=reads
T["poll_tallies"]=[{"ann_id":3,"choice":"Monday","votes":1},{"ann_id":3,"choice":"Tuesday","votes":4},{"ann_id":3,"choice":"Wednesday","votes":1},{"ann_id":3,"choice":"Thursday","votes":1}]
T["push_subs"]=[{"id":n+1,"unit":u,"endpoint":"https://push.example/demo/"+u,"p256dh":"demo","auth":"demo","ua":"Demo phone","created_at":iso(-40),"last_seen":iso(-n)} for n,u in enumerate(["H-100","H-101","H-102","H-103","H-105","H-109","D-301"])]
T["scene_alarms"]=[]
T["supply_requests"]=[
 {"id":1,"created_at":iso(-1,16),"unit":"H-103","name":"Yosef Green","source":"jumpbag","ambulance":"","items":[{"item_id":38,"name":"Oral Glucose","qty":"1","why":"Missing"},{"item_id":36,"name":"Test Strips","qty":"10","why":"Short"}],"note":"Used on a call last night","status":"open","status_by":"","status_at":None,"notified":"3 emailed, 2 pushed"},
 {"id":2,"created_at":iso(-4,11),"unit":"H-110","name":"Chaim Gold","source":"inventory","ambulance":"A1 Ambulance - 1","items":[{"name":"4x4 sterile","qty":"25","why":"Only 8 left"},{"name":"Tourniquet","qty":"2","why":"Missing"}],"note":"","status":"ordered","status_by":"Demo Admin (H-100)","status_at":iso(-3,9),"notified":"3 emailed, 2 pushed"},
 {"id":3,"created_at":iso(-12,8),"unit":"H-101","name":"Avi Berger","source":"jumpbag","ambulance":"","items":[{"item_id":13,"name":"Trauma Dressing Sheet","qty":"1","why":"Missing"}],"note":"","status":"done","status_by":"Chaim Gold (H-110)","status_at":iso(-9,15),"notified":"3 emailed, 2 pushed"}]
T["resources"]=[{"id":1,"order_col":"1","title":"Standard Operating Procedures","description":"Current SOP book — updated scene-safety section.","file":"doc:resources/demo-sop.pdf","active":"X"},
 {"id":2,"order_col":"2","title":"Radio quick guide","description":"Channels, zones and plain-language phrases.","file":"doc:resources/demo-radio.pdf","active":"X"},
 {"id":3,"order_col":"3","title":"Shabbos procedures","description":"What changes on Shabbos and Yom Tov, and what doesn't.","file":"doc:resources/demo-shabbos.pdf","active":"X"},
 {"id":4,"order_col":"4","title":"Medication reference card","description":"Doses by weight, pediatric and adult.","file":"doc:resources/demo-meds.pdf","active":"X"},
 {"id":5,"order_col":"5","title":"Uniform & dress policy","description":"","file":"doc:resources/demo-dress.pdf","active":""}]
T["jumpbag_status"]=[]; T["jumpbag_bags"]=[]; T["jumpbag_reminders"]=[]; T["ambulance_checks"]=[]

counts={k:len(v) for k,v in T.items()}
js="/* Sample data for the demo. Every person, phone, address, code and document here is invented;\n   the lists (hospitals, equipment, jump bag items, vitals, task book, protocols) are the real ones.\n   Built by scratch/demo/build_demo_data.py. */\nwindow.HOH_DEMO_DATA="+json.dumps(T, ensure_ascii=False, separators=(",",":"))+";\n"
import os; os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT,"w",encoding="utf-8").write(js)
print(json.dumps(counts, indent=0)); print("bytes", len(js.encode("utf-8")))
