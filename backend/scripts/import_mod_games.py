import sqlite3
import os
import sys
import json
import time
from pathlib import Path

# Setup path to import backend modules
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.database import DATABASE_FILE, init_new_tables, engine
from app.models import Base, Category, Game, Package
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Parsed data
data = {
    "Tower Defense / Strategy": [
        {"name": "DOMINATIONS", "cheats": ["เสกสัตว์และทรัพยากร (Gold/Food/Oil) แบบไม่จำกัด"], "search": "DomiNations"},
        {"name": "Arcane Arena", "cheats": ["รับของฟรีรายวันไม่จำกัด", "Gacha ฟรี HeroShard ไม่อั้น"], "search": "Arcane Arena"},
        {"name": "Bounce Defense", "cheats": ["ซื้อของฟรีทุกอย่าง", "Cheat Mode: Add Ball, Victory, Unlock All Hero"], "search": "Bounce Defense"},
        {"name": "Castle Defenders Clash", "cheats": ["เสกเพชรและทองรัวๆ"], "search": "Castle Defenders"},
        {"name": "Defense Legends 5", "cheats": ["ตั้งค่า Gem, Energy, Hero Space เต็มเปี่ยม", "อัปเกรดปืน Max ทันที + ยิงรัวแบบ TimeAttack"], "search": "Defense Legends 5"},
        {"name": "Mighty Army Clash", "cheats": ["ซื้อฟรีข้ามการจ่ายเงิน", "ล็อกเรท Gacha Legendary 100%", "เสกทหารทันทีในสนาม"], "search": "Mighty Army Clash"},
        {"name": "Mob Control", "cheats": ["เสกทองและตั๋วไม่อั้น", "ปลดล็อก VIP Elite ถาวรตลอดชีพ", "ปลดล็อกและอัปเวลการ์ดทุกใบ Max"], "search": "Mob Control"},
        {"name": "North War : Island Defense 3D", "cheats": ["เปิด Cheat Panel: Add Gear, Coins, Unlock All", "ซื้อของฟรีผ่าน Purchase Bypass"], "search": "North War : Island Defense 3D"},
        {"name": "Raid Rush", "cheats": ["รับเพชรและแพ็กเกจฟรีรัวๆ"], "search": "Raid Rush"},
        {"name": "Star Defense : Alliance TD", "cheats": ["ปุ่ม Cheat เสกของและสกุลเงิน", "ValidProduct ซื้อของฟรี"], "search": "Star Defense : Alliance TD"},
        {"name": "Stickman Defense", "cheats": ["ซื้อฟรีเต็มรูปแบบ", "Auto Win ชนะทันที + พลังโกรธเต็มตลอด"], "search": "Stickman Defense"},
        {"name": "Survival Arena", "cheats": ["เปิด Debug Mode: Unlock Characters, Max Tower, Fake Win, Emojis"], "search": "Survival Arena"},
        {"name": "Survivor Base", "cheats": ["ซื้อกล่องของขวัญฟรี", "เปิดเมนู GM Debugger Tools"], "search": "Survivor Base"},
        {"name": "Wizard Tower: Idle TD", "cheats": ["Free Shopping เปลี่ยนสินค้าเสียเงินให้เป็นฟรี"], "search": "Wizard Tower: Idle TD"}
    ],
    "Idle RPG & Action RPG": [
        {"name": "32 Heroes", "cheats": ["เสกเงินรัวๆ", "ซื้อฟรีข้ามระบบจ่ายเงิน"], "search": "32 Heroes"},
        {"name": "Age of Heroes", "cheats": ["แก้ไข Data ตรง (Coin/Gem)", "บั๊กหีบสมบัติเสกเพชร", "ปลดล็อก BattlePass แบบ Premium และ Hero Max Level"], "search": "Age of Heroes"},
        {"name": "Arcana Blade", "cheats": ["ซื้อของฟรีทุกชิ้นโดยแก้ราคาเป็น 0", "ปุ่มลับ GiveAllCustom รับทรัพยากรทุกอย่าง"], "search": "Arcana Blade: Idle RPG"},
        {"name": "Ash N Veil", "cheats": ["แก้ไขยอดเงินและไอเทมได้ตามสั่ง", "ซื้อฟรีผ่านการ Bypass"], "search": "Ash N Veil"},
        {"name": "Backpack Legends", "cheats": ["เสกของทุกอย่างด้วย Cheat Tool", "ปลดล็อกช่องเป้และอุปกรณ์ทั้งหมด"], "search": "Backpack Legends"},
        {"name": "Backpack Survivors", "cheats": ["ซื้อกาชาฟรีและเปิดแพ็กเกจฟรี", "Auto Win ตายเกิดข้ามด่าน"], "search": "Backpack Survivors"},
        {"name": "Bad 2 Bad: Apocalypse", "cheats": ["ปืนและไอเทมดรอปกระจาย (100% Drop)", "ซื้อฟรี (ต้อง Relog เพื่อรับของ)"], "search": "Bad 2 Bad: Apocalypse"},
        {"name": "Beam of Magic", "cheats": ["เพิ่มทองและเพชร", "บั๊กหีบสุ่ม Legendary 100% + อมตะ (God Mode)"], "search": "Beam of Magic"},
        {"name": "Cat Legends", "cheats": ["เจาะ ID เพื่อรับของซื้อฟรี"], "search": "Cat Legends - Idle RPG"},
        {"name": "Combat Quest", "cheats": ["ซื้อของ Gacha ฟรีปรับราคาเป็น 0", "ล็อกการันตี Legend ตู้กาชา (Pity 1)"], "search": "Combat Quest"},
        {"name": "Dark Clan", "cheats": ["Redirect Buy เพื่อรับของฟรี"], "search": "Dark Clan"},
        {"name": "Dungeon Slasher", "cheats": ["เสกเงินและสกิน", "ซื้อฟรีรหัสผ่าน Valid Receipt"], "search": "Dungeon Slasher: Roguelike"},
        {"name": "Epic Trio", "cheats": ["ปลดล็อกแพ็กโดยตรง", "เปิด Cheat UI แจก God Mode, เงิน 100M, โจมตี 10K"], "search": "Epic Trio"},
        {"name": "Eternal Hero", "cheats": ["แจก Bundle ฟรีทั้งหมด", "เจาะซื้อเจาะจงแพ็ก"], "search": "Eternal Hero"},
        {"name": "Evil Sword", "cheats": ["Idle Reward Hack ปลอดภัย (ห้ามเกิน 100k)", "ปลดล็อก Max Skill ทั้งหมด"], "search": "Evil Sword"},
        {"name": "Fairy Tail Wizard Chronicle", "cheats": ["เปลี่ยนช็อปให้ซื้อฟรี", "Mail Hack ปั้มของจากจดหมายรับซ้ำได้เรื่อยๆ"], "search": "Fairy Tail Wizard Chronicle"},
        {"name": "Fortias Saga", "cheats": ["เสกทรัพยากรและอุปกรณ์ระดับสูงแบบสุ่ม", "โหมดโจมตีทีเดียวตาย + ปลดล็อก Hero ทุกตัว"], "search": "Fortias Saga"},
        {"name": "Gear Fight", "cheats": ["เปิด Cheat Menu ปรับเงิน, ดรอปเรท, ตั๋วตีบอส"], "search": "Gear Fight"},
        {"name": "Gladiator Heroes", "cheats": ["ปลุก Dev Tool Scene ปรับแต่งเกมแบบ Admin"], "search": "Gladiator Heroes"},
        {"name": "Hero Raid", "cheats": ["เปลี่ยนราคาเป็นฟรีและไม่จำกัดการซื้อซ้ำ", "Redirect สินค้าเข้ากระเป๋าหรือกล่องจดหมาย"], "search": "Hero Raid: Idle RPG"},
        {"name": "Heroes vs Hordes", "cheats": ["ทองโบนัสมหาศาลและ Level Max ไวมาก", "ปลดล็อกและใช้งาน Heroes ครบทุกตัว"], "search": "Heroes vs Hordes"},
        {"name": "Hex Warrior", "cheats": ["รหัสผ่าน Success Purchase ฟรี", "เปิดระบบ Cheat Unit Test"], "search": "Hex Warrior"},
        {"name": "Hunter Raid", "cheats": ["ปรับแต่งค่า HP/Attack สูงสุด", "Redirect เพื่อซื้อฟรี"], "search": "Hunter Raid: Idle RPG"},
        {"name": "Hunters Origin", "cheats": ["Free Shopping แก้ไขประเภทเหรียญที่จ่ายแบบปลอดภัย Anti-Ban"], "search": "Hunters Origin"},
        {"name": "Idle Berserker", "cheats": ["เจาะ ID ไอเทมและรับไปเลยฟรีๆ 1 ครั้ง"], "search": "Idle Berserker"},
        {"name": "Idle Dungeon Riders", "cheats": ["Bypass ปุ่มกดเพื่อรับของรางวัล (โดยเฉพาะเพชร)"], "search": "Idle Dungeon Riders"},
        {"name": "Idle Hero TD", "cheats": ["รหัสซื้อฟรี CompletePurchase"], "search": "Idle Hero TD"},
        {"name": "Knight Maidens", "cheats": ["เจาะระบบ Encrypt และแก้ Key ทอง", "สุ่มกาชาด้วยราคาติดลบ (กดแล้วได้เพชรแทนเสีย)"], "search": "Knight Maidens"},
        {"name": "Legend of Slime", "cheats": ["Patching ราคาเหมาจ่ายด้วย Gems", "ปลดล็อก Slime ครบทุกตัว"], "search": "Legend of Slime"},
        {"name": "Loadout Warrior", "cheats": ["ปลุก Dev Cheat Button สำหรับ God Mode และเสกไอเทม"], "search": "Loadout Warrior"},
        {"name": "Loot Heroes", "cheats": ["เพิ่มสกุลเงินและการ์ดฮีโร่ตามสั่ง", "เสกอุปกรณ์ระดับ Rarity Infinite"], "search": "Loot Heroes"},
        {"name": "Lucky Heroes", "cheats": ["เพิ่มข้อมูลและเลเวลตัวละครทุกตัว", "ปั้มแต้ม 100k ขึ้น Top 1 Leaderboard ทันที"], "search": "Lucky Heroes"},
        {"name": "Monster Slayer", "cheats": ["หา ID แล้วเรียก Method เพื่อรับสินค้าฟรี"], "search": "Monster Slayer: Idle RPG"},
        {"name": "Overgeared Hero", "cheats": ["เปิดใช้งาน DeveloperPopup (เสกของ ข้ามด่าน ปลดล็อกหมด)"], "search": "Overgeared Hero"},
        {"name": "Pixel Blade M VIP", "cheats": ["แก้ไข Data ทอง เพชร กุญแจ ได้ตามชอบ", "เสกอุปกรณ์ดาว 5 อัตโนมัติ", "ซื้อฟรีไม่ต้องใช้ ID"], "search": "Pixel Blade M VIP"},
        {"name": "Pocket Rivals", "cheats": ["Bypass แจกโปรดักต์ฟรี", "สุ่มการ์ดและรีเฟรชในเกมฟรีแบบรัวๆ"], "search": "Pocket Rivals"},
        {"name": "Rumble Heroes", "cheats": ["ช็อปฟรี เปลี่ยนหมวดหมู่ราคา"], "search": "Rumble Heroes"},
        {"name": "Rumble Paws", "cheats": ["Bypass แบบ String ID", "ปรับตู้ Gacha ให้แจก Tier S 100% และราคา 0"], "search": "Rumble Paws"},
        {"name": "Rumble Squad", "cheats": ["เปลี่ยนสกุลเงินของจริงให้กลายเป็นเงินในเกมแทน", "ปรับตู้ Gacha เลเวล 10 แม็กซ์ไวสุดๆ"], "search": "Rumble Squad"},
        {"name": "Shadow Hunter", "cheats": ["ปลุก Settings เป็น Developer Mode เสกเพชรเงินทันที"], "search": "Shadow Hunter: Lost World"},
        {"name": "Shadow Slayer", "cheats": ["เปิดหน้าต่าง Cheat UI ทางขวาของจอ"], "search": "Shadow Slayer: The Dark Impact"},
        {"name": "Slime Castle", "cheats": ["เงินเยอะ ข้ามรวดเดียวจบ Chapter", "ปลดล็อกและอัปเกรด Talent Slime 全部"], "search": "Slime Castle - Idle Defense"},
        {"name": "Solo Survivor IO", "cheats": ["เพิ่มทอง", "ศัตรูตายทันที บอมบ์ แม่เหล็ก Auto Win ทำงาน"], "search": "Solo Survivor IO"},
        {"name": "Spin Spin Defense", "cheats": ["ดัดแปลงช็อปเสกเพชรและทอง", "กาชา 100% Rate ปลดล็อก BattlePass ฟรี ข้ามโฆษณา"], "search": "Spin Spin Defense"},
        {"name": "Super Bear Adventure", "cheats": ["Bypass การซื้อด้วย Receipt ยืนยัน", "ปลดล็อกชุด Cosmetic ทั้งหมดใน SaveGame"], "search": "Super Bear Adventure"},
        {"name": "Swamp Attack 2", "cheats": ["กดยกเลิกรับของฟรีทันที (Purchase Failure Bypass)", "Auto Win ชนะทุกด่านรวดเดียวจบ"], "search": "Swamp Attack 2"},
        {"name": "Switching Heroes", "cheats": ["ปรับราคา IAP ให้ฟรีและซื้อซ้ำรัวๆ ได้"], "search": "Switching Heroes"},
        {"name": "Tailed Demon Slayer", "cheats": ["รับของฟรีโดยใช้ ID", "SROption แจก EXP Max, Add All Item, Max Skill"], "search": "Tailed Demon Slayer"},
        {"name": "Tap Dragon", "cheats": ["ส่งของชิ้นใหญ่เข้าจดหมายแบบฟรีๆ"], "search": "Tap Dragon"},
        {"name": "Tiny Reaper", "cheats": ["ปลดรหัส Encrypt และเสกจำนวนของที่ต้องการ"], "search": "Tiny Reaper"},
        {"name": "Tower Raid", "cheats": ["Handle ของฟรีโดยตรงข้ามหน้าจ่ายเงิน", "เสกทองล้นจอบนสนามรบ"], "search": "Tower Raid"},
        {"name": "Transcendent", "cheats": ["ปรับ Quest Requirement เป็น 1 ให้เงิน CashCoin มหาศาล", "เสกเงินด่วนตามสั่ง"], "search": "Transcendent"},
        {"name": "Underdark : Defense", "cheats": ["อัปเกรด Account เวล 21 รับฮีโร่ครบทั้งหมดทันที", "ซื้อของเงียบไม่ติดแจ้งเตือนการเก็บเงิน", "แก้ Types สินค้ารางวัลใหญ่"], "search": "Underdark : Defense"}
    ],
    "Shooter, Action & Multiplayer": [
        {"name": "Mech Wars", "cheats": ["ปลดล็อก Premium Battle Pass ฟรี"], "search": "Mech Wars"},
        {"name": "Steel Rage", "cheats": ["ปืนกลไร้หลอดกระสุน ยิงรัวไม่ต้อง Reload"], "search": "Steel Rage: Mech Cars PvP War"},
        {"name": "Warplanes Online Combat", "cheats": ["แจกเครื่องบินฟรีจากโบนัสซอร์สอื่น"], "search": "Warplanes: Online Combat"},
        {"name": "CarX Street", "cheats": ["ซื้อรถทุกคันราคา 0", "เสกเงินและทองไม่จำกัด"], "search": "CarX Street"},
        {"name": "R.A.C.E (Rocket Arena Car Extreme)", "cheats": ["เจาะข้อมูลหีบเพิ่มระดับรับ Premium Crystal มหาศาล"], "search": "Rocket Arena Car Extreme"},
        {"name": "Battle of Warships", "cheats": ["เรือรบฟรี Handle Product Bypass", "อัปเกรดระหว่างวิ่ง (Speed Max + ยิงรัว)"], "search": "Battle of Warships"},
        {"name": "Frag Pro Shooter", "cheats": ["สุ่มของฟรีได้กล่องละ 7000+ ชิ้น", "God Mode, Fly Mode, กระสุนไม่จำกัด, บอทเดินเอ๋อหยุดนิ่ง"], "search": "FRAG Pro Shooter"},
        {"name": "Guns at Dawn", "cheats": ["เสกทองและซื้อฟรีแบบ Add Buy Method"], "search": "Guns at Dawn"},
        {"name": "Otherworld Legends", "cheats": ["OnPurchaseSucceeded เพื่อเจาะข้อมูลซื้อของทุกอย่างฟรี"], "search": "Otherworld Legends"},
        {"name": "Quack Bag", "cheats": ["กดยกเลิกหลอกเพื่อรับบัฟสำเร็จ", "เปิด GM Tool แดงเสกปืนและฮีโร่ทั้งหมด"], "search": "Quack Bag"},
        {"name": "Rush: Xtream", "cheats": ["Unlock สกินรถแจ่มๆ ทั้งหมดและรับเงินเต็มสูบ"], "search": "Rush: Xtream"},
        {"name": "Tanks Arena", "cheats": ["เสกตั๋วเงิน Scraps เพชร Carbon Flow ไวมาก", "Patch Pricing ทุกตู้ให้กลายเป็นเมนูของฟรี"], "search": "Tanks Arena io"},
        {"name": "Vortex 9", "cheats": ["ข้ามโฆษณารับรางวัล BP ระดับ Legend/Epic รวดเดียว", "ปืนทำลายล้าง 1 นัดดาเมจ 1200 + 5000 Ammo"], "search": "Vortex 9"},
        {"name": "Zombie Royal IO", "cheats": ["ปรับแต่ง Health, Armor, Damage, Ammo ระดับเทพเจ้า"], "search": "Zombie Royal IO"},
        {"name": "Zombie Warfare", "cheats": ["Offline Patching ฟรีทุกสินค้าที่ขวางหน้า", "ตู้กาชาฟรีไม่มีลิมิต Cost=0"], "search": "Zombie Warfare"}
    ]
}

def clean_package_name(cheat):
    text = cheat.lower()
    
    # Transform Client-side cheats (God mode, GM tool) into 'Boosting/Farming Services'
    if "god mode" in text or "อมตะ" in text or "auto win" in text or "ชนะทันที" in text:
        return "บริการ: รับจบด่าน/ปั้มแรงค์แบบสปีดรัน (รับประกันผลงาน)"
    if "gm tool" in text or "cheat panel" in text or "dev tool" in text:
        return "แพ็กเกจ: อัดทรัพยากรทุกชนิดแบบจัดเต็ม (ผ่านช่องโหว่ลับ)"
        
    # Transform Free Shopping into 'Gacha / Rare item pulling'
    if "ซื้อฟรี" in text or "free shopping" in text or "bypass" in text or "ช็อปฟรี" in text:
        return "แพ็กเกจ: ดึงไอเทมพรีเมียม / สุ่มกาชารับของแรร์ติดไอดี"
        
    # Transform VIP / Unlocks
    if "unlock" in text or "ปลดล็อก" in text or "vip" in text:
        return "แพ็กเกจ: ปลดล็อก VIP / ของสวมใส่ถาวร (ผูกติดไอดี)"
        
    # Default for resources
    if "เสก" in text or "เงิน" in text or "ทอง" in text or "เพชร" in text:
        return "แพ็กเกจ: เสกทรัพยากรพื้นฐาน (ซื้อซ้ำได้ตลอด)"
        
    return f"บริการพิเศษ: {cheat.strip()}"

def determine_price(cheats_text):
    text = " ".join(cheats_text).lower()
    # ช่วงราคา 60-200 บาท ประเมินตาม 'สิ่งที่ติดไอดีลูกค้า' เป็นหลัก
    if "unlock" in text or "ปลดล็อก" in text or "vip" in text or "gm tool" in text or "cheat panel" in text or "dev tool" in text:
        return 199.0 # ได้ของถาวรสุดคุ้ม เช่น VIP, ของครบ, หรือทรัพยากรมหาศาล
    if "ซื้อฟรี" in text or "free shopping" in text or "bypass" in text or "ช็อปฟรี" in text:
        return 149.0 # ดึงของแรร์หรือกาชาเข้าไอดี
    if "เสก" in text or "เงิน" in text or "ทอง" in text or "เพชร" in text or "เพิ่มสกุลเงิน" in text or "ทรัพยากร" in text:
        return 89.0 # ทรัพยากรพื้นฐาน ซื้อซ้ำได้บ่อยๆ
    
    # พวก God mode / Auto win แปลงเป็นบริการรับฟาร์ม
    return 69.0 # บริการรับฟาร์ม / ผ่านด่าน ราคาเริ่มต้นซื้อง่าย

# Function to safely search play store
def fetch_play_store_info(query):
    try:
        from google_play_scraper import search, app as scrape_app
        print(f"Searching Play Store for: {query}")
        res = search(query, lang='en', country='us')
        if res and len(res) > 0:
            app_id = res[0]['appId']
            # Fetch detailed app info
            app_info = scrape_app(app_id, lang='th', country='th')
            return {
                "icon": app_info.get("icon", "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400"),
                "description": app_info.get("summary", "") or "สุดยอดเกมมันส์ เล่นเพลินไม่มีเบื่อ พร้อมบริการสุด VIP"
            }
    except Exception as e:
        print(f"Failed to find info for {query}: {e}")
        
    return {
        "icon": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400",
        "description": "สุดยอดเกมฮิตที่ใครๆ ก็เล่น พร้อมเปิดให้โกงกันเต็มสูบแบบไร้ขีดจำกัดแล้ววันนี้!"
    }

def run_import():
    print("Ensure tables exist...")
    init_new_tables()
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create categories
        category_map = {}
        for cat_name in data.keys():
            cat = db.query(Category).filter(Category.name == cat_name).first()
            if not cat:
                cat = Category(name=cat_name)
                db.add(cat)
                db.commit()
                # Query again to get the assigned ID
                cat = db.query(Category).filter(Category.name == cat_name).first()
            category_map[cat_name] = cat.id

        # Insert games and packages
        count = 0
        for cat_name, games_list in data.items():
            cat_id = category_map[cat_name]
            
            for g in games_list:
                game_name = g["name"]
                
                # Check if game exists
                existing_game = db.query(Game).filter(Game.name == game_name).first()
                if existing_game:
                    print(f"Game already exists: {game_name}")
                    continue
                    
                # Fetch Play Store Info
                info = fetch_play_store_info(g["search"] or game_name)
                time.sleep(1) # Prevent rate limiting
                
                # Assign ban risk based on hints
                cheats_text = " ".join(g["cheats"])
                risk_pct = 0
                status = "Safe"
                if "hinter origin" in game_name.lower() or "evil sword" in game_name.lower() or "anti-ban" in cheats_text.lower():
                    risk_pct = 50
                    status = "Warning"
                    
                new_game = Game(
                    category_id=cat_id,
                    name=game_name,
                    image=info["icon"],
                    cover_image=info["icon"].replace("s180", "s1024") if "googleusercontent" in info["icon"] else info["icon"],
                    description=info["description"],
                    is_hot=True if count % 5 == 0 else False,
                    has_bonus=True if "ฟรี" in cheats_text else False,
                    ban_risk_percentage=risk_pct,
                    ban_status=status
                )
                db.add(new_game)
                db.commit() # commit first to get it fully saved
                db.refresh(new_game)
                
                # Insert Packages (Services)
                base_price = determine_price(g["cheats"])
                
                # P1: Specific cheat
                db.add(Package(
                    game_id=new_game.id,
                    name=f"ฟีเจอร์: {clean_package_name(g['cheats'][0])}",
                    price=base_price,
                    original_price=base_price * 1.5,
                    is_bestseller=True,
                    points_reward=int(base_price / 10)
                ))
                
                # P2: All combined if multiple cheats
                if len(g["cheats"]) > 1:
                    combo_price = base_price * 1.8
                    db.add(Package(
                        game_id=new_game.id,
                        name=f"ฟูลออปชั่น (FULL OPTION): {' + '.join(g['cheats'])}",
                        price=combo_price,
                        original_price=combo_price * 2,
                        is_bestseller=False,
                        points_reward=int(combo_price / 10)
                    ))
                
                db.commit()
                count += 1
                print(f"Imported: {game_name} with {len(g['cheats'])} options")
                
        print(f"Successfully imported {count} new games!")
    finally:
        db.close()

if __name__ == "__main__":
    run_import()