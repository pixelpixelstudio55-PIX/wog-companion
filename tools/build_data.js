// Builds assets/game_data.js from the raw extracted game data tables.
// Source data was extracted (with Node's own JS engine, not eval'd unsafely -
// via `new Function(src + '; return X;')`) from a public GitHub Pages fan
// site's own client-side JS, which itself just holds a static, hardcoded
// game-mechanics database (skill %, stage HP, gold rates, jewel/equipment
// stats) - factual game data, not the site's own branding/design/copy, which
// this project does not reuse anywhere.
//
// This script's job: translate every player-facing string into Thai + keep/
// derive English, using a template-substitution approach rather than
// per-entry translation - the underlying descriptions only follow 99 (skill)
// + 40 (training/equipment stat) distinct sentence patterns even though they
// repeat across 1000+ individual level entries, so each pattern is hand-
// translated ONCE here and the real numbers are substituted back in on
// output, in the same order they appeared in the original text.
const fs = require('fs');
const RAW = __dirname + '/../raw/';
const OUT = __dirname + '/../assets/game_data.js';

function load(name, file) {
  const src = fs.readFileSync(RAW + file, 'utf8');
  return new Function(src + '; return ' + name + ';')();
}

// ---------- template translators ----------
// key = original Vietnamese text with every number replaced by "N"
// value = [thai, english] using {0},{1},... in the same left-to-right order
// the numbers appeared in the Vietnamese original.
const SKILL_DESC_MAP = {
"Gây N% sát thương.": ["สร้างความเสียหาย {0}%", "Deal {0}% damage."],
"Gây N% sát thương và giảm N% công lực, N% tốc đánh của mục tiêu trong N giây.": ["สร้างความเสียหาย {0}% และลดพลังโจมตี {1}%, ความเร็วโจมตี {2}% ของเป้าหมายเป็นเวลา {3} วินาที", "Deal {0}% damage and reduce target's Attack Power by {1}%, Attack Speed by {2}% for {3}s."],
"Gây N% sát thương và giảm N trúng đích chí mạng, N% sát thương chí mạng của mục tiêu trong N giây.": ["สร้างความเสียหาย {0}% และลดค่าคำนวณคริติคอล {1}, ความเสียหายคริติคอล {2}% ของเป้าหมายเป็นเวลา {3} วินาที", "Deal {0}% damage and reduce target's Critical Precision by {1}, Critical Damage by {2}% for {3}s."],
"Gây N% sát thương và gây choáng N% cho mục tiêu trong N giây.": ["สร้างความเสียหาย {0}% และทำให้เป้าหมายมึนงง {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and Stun the target by {1}% for {2}s."],
"Gây N% sát thương và giảm N% sát thương nhận vào trong N giây.": ["สร้างความเสียหาย {0}% และลดความเสียหายที่ได้รับ {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and reduce damage taken by {1}% for {2}s."],
"Gây N% sát thương trong phạm vi rộng và giảm N% phòng thủ của mục tiêu.": ["สร้างความเสียหาย {0}% เป็นวงกว้าง และลดพลังป้องกันเป้าหมาย {1}%", "Deal {0}% damage in a wide area and reduce target's Defense by {1}%."],
"Tiêu hao N% HP và tăng N% công lực trong N giây.": ["ใช้ HP {0}% และเพิ่มพลังโจมตี {1}% เป็นเวลา {2} วินาที", "Consume {0}% HP and increase Attack Power by {1}% for {2}s."],
"Gây N% sát thương và tăng N% phòng thủ trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มพลังป้องกัน {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Defense by {1}% for {2}s."],
"Gây N% sát thương và tăng N chặn trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าบล็อก {1} เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Block by {1} for {2}s."],
"Gây N% sát thương và tăng N trúng đích sét, N% sát thương sét trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าคำนวณสายฟ้า {1}, ความเสียหายสายฟ้า {2}% เป็นเวลา {3} วินาที", "Deal {0}% damage and increase Lightning Precision by {1}, Lightning Damage by {2}% for {3}s."],
"Gây N% sát thương và tăng N% sát thương lên Boss trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มความเสียหายต่อบอส {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and increase damage to Boss by {1}% for {2}s."],
"Gây N% sát thương và giảm N giây thời gian hồi của mọi kỹ năng của bản thân.": ["สร้างความเสียหาย {0}% และลดคูลดาวน์สกิลทั้งหมดของตัวเอง {1} วินาที", "Deal {0}% damage and reduce all of your own skills' cooldown by {1}s."],
"Gây N% sát thương và tạo khiên bằng N% HP tối đa của bản thân trong N giây.": ["สร้างความเสียหาย {0}% และสร้างโล่เท่ากับ {1}% ของ HP สูงสุดตัวเองเป็นเวลา {2} วินาที", "Deal {0}% damage and create a shield equal to {1}% of your Max HP for {2}s."],
"Gây N% sát thương cho kẻ địch xung quanh. Trong N giây, khi Sét kích hoạt, giảm N% sát thương phải nhận trong N giây. (tối đa N lớp)": ["สร้างความเสียหาย {0}% ให้ศัตรูรอบตัว ภายใน {1} วินาที เมื่อสายฟ้าทำงาน จะลดความเสียหายที่ได้รับ {2}% เป็นเวลา {3} วินาที (สูงสุด {4} ชั้น)", "Deal {0}% damage to surrounding enemies. Within {1}s, when Lightning triggers, reduce damage taken by {2}% for {3}s. (max {4} stacks)"],
"Khi dùng kỹ năng, có N% tỉ lệ tăng N% công lực trong N giây.": ["เมื่อใช้สกิล มีโอกาส {0}% ที่จะเพิ่มพลังโจมตี {1}% เป็นเวลา {2} วินาที", "When using a skill, {0}% chance to increase Attack Power by {1}% for {2}s."],
"Mỗi N giây, sơ cứu và hồi N% HP.": ["ทุกๆ {0} วินาที ปฐมพยาบาลและฟื้นฟู HP {1}%", "Every {0}s, first-aid and restore {1}% HP."],
"Mỗi N giây, tăng N% sát thương sét trong N giây.": ["ทุกๆ {0} วินาที เพิ่มความเสียหายสายฟ้า {1}% เป็นเวลา {2} วินาที", "Every {0}s, increase Lightning Damage by {1}% for {2}s."],
"Khi kẻ địch bị choáng, tăng N% công lực. (không cộng dồn)": ["เมื่อศัตรูมึนงง เพิ่มพลังโจมตี {0}% (ไม่สะสม)", "When enemy is Stunned, increase Attack Power by {0}%. (does not stack)"],
"Khi gây sát thương sét, tăng N% công lực trong N giây. (không cộng dồn)": ["เมื่อสร้างความเสียหายสายฟ้า เพิ่มพลังโจมตี {0}% เป็นเวลา {1} วินาที (ไม่สะสม)", "When dealing Lightning damage, increase Attack Power by {0}% for {1}s. (does not stack)"],
"Sau khi tiêu diệt kẻ địch, tăng N% tốc chạy trong N giây. (không cộng dồn)": ["หลังกำจัดศัตรู เพิ่มความเร็วเคลื่อนที่ {0}% เป็นเวลา {1} วินาที (ไม่สะสม)", "After defeating an enemy, increase Movement Speed by {0}% for {1}s. (does not stack)"],
"Khi bắt đầu trận đấu, tăng N% công lực, N% tốc đánh và N% tốc chạy trong N giây.": ["เมื่อเริ่มการต่อสู้ เพิ่มพลังโจมตี {0}%, ความเร็วโจมตี {1}% และความเร็วเคลื่อนที่ {2}% เป็นเวลา {3} วินาที", "At the start of battle, increase Attack Power by {0}%, Attack Speed by {1}%, and Movement Speed by {2}% for {3}s."],
"Mỗi N giây, giảm N% sát thương phải nhận trong N giây.": ["ทุกๆ {0} วินาที ลดความเสียหายที่ได้รับ {1}% เป็นเวลา {2} วินาที", "Every {0}s, reduce damage taken by {1}% for {2}s."],
"Khi bị choáng, tăng N% phòng thủ.": ["เมื่อถูกทำให้มึนงง เพิ่มพลังป้องกัน {0}%", "When Stunned, increase Defense by {0}%."],
"Khi tấn công cùng một mục tiêu N lần, tăng N chặn trong N giây.": ["เมื่อโจมตีเป้าหมายเดิม {0} ครั้ง เพิ่มค่าบล็อก {1} เป็นเวลา {2} วินาที", "When attacking the same target {0} times, increase Block by {1} for {2}s."],
"Khi chặn, giảm N% sát thương nhận vào trong N giây. (không cộng dồn)": ["เมื่อบล็อก ลดความเสียหายที่ได้รับ {0}% เป็นเวลา {1} วินาที (ไม่สะสม)", "When Blocking, reduce damage taken by {0}% for {1}s. (does not stack)"],
"Khi HP giảm xuống dưới N%, hồi N% HP. (Một lần mỗi trận)": ["เมื่อ HP ลดลงต่ำกว่า {0}% ฟื้นฟู HP {1}% (ใช้ได้ครั้งเดียวต่อการต่อสู้)", "When HP drops below {0}%, restore {1}% HP. (once per battle)"],
"Khi HP giảm xuống dưới N%, tăng N chặn trong N giây.": ["เมื่อ HP ลดลงต่ำกว่า {0}% เพิ่มค่าบล็อก {1} เป็นเวลา {2} วินาที", "When HP drops below {0}%, increase Block by {1} for {2}s."],
"Khi HP giảm xuống còn N% hoặc thấp hơn, trở nên bất tử trong N giây. (N lần mỗi trận)": ["เมื่อ HP เหลือ {0}% หรือต่ำกว่า จะอมตะเป็นเวลา {1} วินาที ({2} ครั้งต่อการต่อสู้)", "When HP reaches {0}% or below, become Invincible for {1}s. ({2} times per battle)"],
"Tăng N% phòng thủ.": ["เพิ่มพลังป้องกัน {0}%", "Increase Defense by {0}%."],
"Tăng N% HP.": ["เพิ่ม HP {0}%", "Increase HP by {0}%."],
"Tăng N chặn.": ["เพิ่มค่าบล็อก {0}", "Increase Block by {0}."],
"Tăng N trúng đích sét.": ["เพิ่มค่าคำนวณสายฟ้า {0}", "Increase Lightning Precision by {0}."],
"Tăng Chính Xác Điện Giật thêm N.": ["เพิ่มความแม่นยำไฟฟ้าช็อตอีก {0}", "Increase Shock Accuracy by an additional {0}."],
"Tăng N hồi phục tự nhiên.": ["เพิ่มการฟื้นฟูตามธรรมชาติ {0}", "Increase Natural Regeneration by {0}."],
"Giảm N% sát thương phải nhận.": ["ลดความเสียหายที่ได้รับ {0}%", "Reduce damage taken by {0}%."],
"Gây N% sát thương và tăng N né tránh trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าหลบหลีก {1} เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Evasion by {1} for {2}s."],
"Gây N% sát thương và tăng N kháng chí mạng trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าต้านคริติคอล {1} เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Critical Resistance by {1} for {2}s."],
"Gây N% sát thương và tăng N giây thời gian hồi kỹ năng của mục tiêu.": ["สร้างความเสียหาย {0}% และเพิ่มเวลาคูลดาวน์สกิลของเป้าหมายอีก {1} วินาที", "Deal {0}% damage and increase target's skill cooldown by {1}s."],
"Gây N% sát thương và kích nổ mũi tên gây thêm N% sát thương.": ["สร้างความเสียหาย {0}% และจุดระเบิดลูกศรสร้างความเสียหายเพิ่มอีก {1}%", "Deal {0}% damage and detonate the arrow for an additional {1}% damage."],
"Gây N% sát thương và hồi N% HP.": ["สร้างความเสียหาย {0}% และฟื้นฟู HP {1}%", "Deal {0}% damage and restore {1}% HP."],
"Gây N% sát thương. Trong N giây, mỗi đòn đánh thường tăng N% sát thương trong N giây. (Tối đa N cộng dồn)": ["สร้างความเสียหาย {0}% ภายใน {1} วินาที การโจมตีปกติแต่ละครั้งจะเพิ่มความเสียหาย {2}% เป็นเวลา {3} วินาที (สะสมสูงสุด {4} ชั้น)", "Deal {0}% damage. Within {1}s, each basic attack increases damage by {2}% for {3}s. (max {4} stacks)"],
"Gây N% sát thương và tăng N% tốc đánh trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มความเร็วโจมตี {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Attack Speed by {1}% for {2}s."],
"Gây N% sát thương và tăng N% công lực trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มพลังโจมตี {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Attack Power by {1}% for {2}s."],
"Gây N% sát thương và tăng N trúng đích độc, N% sát thương độc trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าคำนวณพิษ {1}, ความเสียหายพิษ {2}% เป็นเวลา {3} วินาที", "Deal {0}% damage and increase Poison Precision by {1}, Poison Damage by {2}% for {3}s."],
"Gây N% sát thương và giảm N% phòng thủ, N chặn của mục tiêu trong N giây.": ["สร้างความเสียหาย {0}% และลดพลังป้องกัน {1}%, ค่าบล็อก {2} ของเป้าหมายเป็นเวลา {3} วินาที", "Deal {0}% damage and reduce target's Defense by {1}%, Block by {2} for {3}s."],
"Gây N% sát thương và gây choáng N% cho mục tiêu trong N giây và tăng N% công lực, N% tốc đánh trong N giây.": ["สร้างความเสียหาย {0}% และทำให้เป้าหมายมึนงง {1}% เป็นเวลา {2} วินาที และเพิ่มพลังโจมตี {3}%, ความเร็วโจมตี {4}% เป็นเวลา {5} วินาที", "Deal {0}% damage, Stun the target by {1}% for {2}s, and increase your own Attack Power by {3}%, Attack Speed by {4}% for {5}s."],
"Gây N% sát thương. Trong N giây, mỗi lần tấn công Độc tăng N né tránh trong N giây. (tối đa N lớp)": ["สร้างความเสียหาย {0}% ภายใน {1} วินาที ทุกครั้งที่โจมตีพิษจะเพิ่มค่าหลบหลีก {2} เป็นเวลา {3} วินาที (สูงสุด {4} ชั้น)", "Deal {0}% damage. Within {1}s, each Poison attack increases Evasion by {2} for {3}s. (max {4} stacks)"],
"Mỗi N giây, giảm N% hiệu quả hồi phục nhận được của toàn bộ kẻ địch trong N giây.": ["ทุกๆ {0} วินาที ลดประสิทธิภาพการฟื้นฟูของศัตรูทั้งหมด {1}% เป็นเวลา {2} วินาที", "Every {0}s, reduce all enemies' healing effectiveness by {1}% for {2}s."],
"Khi nhận đòn chí mạng, tăng N% Tốc đánh trong N giây. (Không cộng dồn)": ["เมื่อโดนคริติคอล เพิ่มความเร็วโจมตี {0}% เป็นเวลา {1} วินาที (ไม่สะสม)", "When hit by a critical strike, increase Attack Speed by {0}% for {1}s. (does not stack)"],
"Khi HP dưới N%, tăng N né tránh. (không cộng dồn)": ["เมื่อ HP ต่ำกว่า {0}% เพิ่มค่าหลบหลีก {1} (ไม่สะสม)", "When HP is below {0}%, increase Evasion by {1}. (does not stack)"],
"Khi kẻ địch bị choáng, tăng N trúng đích chí mạng.": ["เมื่อศัตรูมึนงง เพิ่มค่าคำนวณคริติคอล {0}", "When enemy is Stunned, increase Critical Precision by {0}."],
"Khi HP dưới N%, tăng N% tốc đánh. (không cộng dồn)": ["เมื่อ HP ต่ำกว่า {0}% เพิ่มความเร็วโจมตี {1}% (ไม่สะสม)", "When HP is below {0}%, increase Attack Speed by {1}%. (does not stack)"],
"Sau khi né tránh, tăng N% sát thương của đòn tấn công tiếp theo.": ["หลังจากหลบหลีก เพิ่มความเสียหายของการโจมตีครั้งถัดไป {0}%", "After Evading, increase the next attack's damage by {0}%."],
"Khi HP giảm xuống dưới N%, tăng N né tránh trong N giây để né đòn tấn công. (N lần mỗi trận)": ["เมื่อ HP ลดลงต่ำกว่า {0}% เพิ่มค่าหลบหลีก {1} เป็นเวลา {2} วินาทีเพื่อหลบการโจมตี ({3} ครั้งต่อการต่อสู้)", "When HP drops below {0}%, increase Evasion by {1} for {2}s to dodge attacks. ({3} times per battle)"],
"Sau khi bắt đầu trận đấu, tăng N% tốc chạy trong N giây.": ["หลังเริ่มการต่อสู้ เพิ่มความเร็วเคลื่อนที่ {0}% เป็นเวลา {1} วินาที", "After the battle starts, increase Movement Speed by {0}% for {1}s."],
"Mỗi N lần tấn công cùng một mục tiêu, tăng N% tốc đánh trong N giây. (tối đa N lớp)": ["ทุกๆ {0} ครั้งที่โจมตีเป้าหมายเดิม เพิ่มความเร็วโจมตี {1}% เป็นเวลา {2} วินาที (สูงสุด {3} ชั้น)", "Every {0} attacks on the same target, increase Attack Speed by {1}% for {2}s. (max {3} stacks)"],
"Khi né tránh, tăng N% sát thương gây cho mục tiêu. (tối đa N lớp)": ["เมื่อหลบหลีก เพิ่มความเสียหายต่อเป้าหมาย {0}% (สูงสุด {1} ชั้น)", "When Evading, increase damage dealt to the target by {0}%. (max {1} stacks)"],
"Mỗi N giây, tăng N% sát thương độc trong N giây.": ["ทุกๆ {0} วินาที เพิ่มความเสียหายพิษ {1}% เป็นเวลา {2} วินาที", "Every {0}s, increase Poison Damage by {1}% for {2}s."],
"Khi tấn công độc, tăng N% công lực trong N giây. (Không cộng dồn)": ["เมื่อโจมตีด้วยพิษ เพิ่มพลังโจมตี {0}% เป็นเวลา {1} วินาที (ไม่สะสม)", "When Poison-attacking, increase Attack Power by {0}% for {1}s. (does not stack)"],
"Khi đánh chí mạng, tăng N trúng đích độc trong N giây. (tối đa N lớp)": ["เมื่อคริติคอล เพิ่มค่าคำนวณพิษ {0} เป็นเวลา {1} วินาที (สูงสุด {2} ชั้น)", "On Critical Hit, increase Poison Precision by {0} for {1}s. (max {2} stacks)"],
"Khi tiêu diệt kẻ địch, tăng N% sát thương Độc. (tối đa N lớp)": ["เมื่อกำจัดศัตรู เพิ่มความเสียหายพิษ {0}% (สูงสุด {1} ชั้น)", "When defeating an enemy, increase Poison Damage by {0}%. (max {1} stacks)"],
"Tăng N né tránh.": ["เพิ่มค่าหลบหลีก {0}", "Increase Evasion by {0}."],
"Tăng N chính xác.": ["เพิ่มความแม่นยำ {0}", "Increase Accuracy by {0}."],
"Tăng N trúng đích độc.": ["เพิ่มค่าคำนวณพิษ {0}", "Increase Poison Precision by {0}."],
"Tăng Chính Xác Trúng Độc thêm N.": ["เพิ่มความแม่นยำพิษอีก {0}", "Increase Poison Accuracy by an additional {0}."],
"Tăng N% tốc đánh.": ["เพิ่มความเร็วโจมตี {0}%", "Increase Attack Speed by {0}%."],
"Tăng tầm đánh thêm N%.": ["เพิ่มระยะโจมตีอีก {0}%", "Increase attack range by an additional {0}%."],
"Tăng N% sát thương gây ra cho Boss.": ["เพิ่มความเสียหายต่อบอส {0}%", "Increase damage dealt to Boss by {0}%."],
"Gây N% sát thương và giảm N% phòng thủ của mục tiêu trong N giây.": ["สร้างความเสียหาย {0}% และลดพลังป้องกันเป้าหมาย {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and reduce target's Defense by {1}% for {2}s."],
"Gây N% sát thương cho kẻ địch trong phạm vi rộng và áp dụng Choáng N%.": ["สร้างความเสียหาย {0}% เป็นวงกว้าง และทำให้มึนงง {1}%", "Deal {0}% damage to enemies in a wide area and apply {1}% Stun."],
"Gây N% sát thương và trong N giây, đòn đánh thường khi trúng có N% tỉ lệ áp dụng Thiên Phạt. Thiên Phạt: gây thêm sát thương bằng N% HP hiện tại của mục tiêu.": ["สร้างความเสียหาย {0}% และภายใน {1} วินาที การโจมตีปกติที่โดนมีโอกาส {2}% ที่จะลงทัณฑ์สวรรค์ ทัณฑ์สวรรค์: สร้างความเสียหายเพิ่มเท่ากับ {3}% ของ HP ปัจจุบันเป้าหมาย", "Deal {0}% damage and, within {1}s, basic attacks that hit have a {2}% chance to apply Divine Punishment. Divine Punishment: deal extra damage equal to {3}% of the target's current HP."],
"Gây N% sát thương và tăng N trúng đích chí mạng trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าคำนวณคริติคอล {1} เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Critical Precision by {1} for {2}s."],
"Gây N% sát thương và tăng N% sát thương chí mạng trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มความเสียหายคริติคอล {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and increase Critical Damage by {1}% for {2}s."],
"Gây N% sát thương và tăng N trúng đích lửa, N% sát thương lửa trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มค่าคำนวณไฟ {1}, ความเสียหายไฟ {2}% เป็นเวลา {3} วินาที", "Deal {0}% damage and increase Fire Precision by {1}, Fire Damage by {2}% for {3}s."],
"Gây N% sát thương và giảm N% tốc đánh, N% tốc chạy của mục tiêu trong N giây.": ["สร้างความเสียหาย {0}% และลดความเร็วโจมตี {1}%, ความเร็วเคลื่อนที่ {2}% ของเป้าหมายเป็นเวลา {3} วินาที", "Deal {0}% damage and reduce target's Attack Speed by {1}%, Movement Speed by {2}% for {3}s."],
"Gây N% sát thương cho kẻ địch trong phạm vi rộng. Trong N giây, khi xảy ra chí mạng, tăng N% sát thương chí mạng trong N giây. (tối đa N lớp)": ["สร้างความเสียหาย {0}% เป็นวงกว้าง ภายใน {1} วินาที เมื่อเกิดคริติคอล จะเพิ่มความเสียหายคริติคอล {2}% เป็นเวลา {3} วินาที (สูงสุด {4} ชั้น)", "Deal {0}% damage to a wide area. Within {1}s, on Critical Hit, increase Critical Damage by {2}% for {3}s. (max {4} stacks)"],
"Gây N% sát thương và tăng N% sát thương của mọi đòn tấn công trong N giây.": ["สร้างความเสียหาย {0}% และเพิ่มความเสียหายของการโจมตีทุกครั้ง {1}% เป็นเวลา {2} วินาที", "Deal {0}% damage and increase the damage of all attacks by {1}% for {2}s."],
"Gây N% sát thương. Trong N giây, mỗi lần Lửa xảy ra, tăng N tỷ lệ chí mạng trong N giây. (tối đa N lớp)": ["สร้างความเสียหาย {0}% ภายใน {1} วินาที ทุกครั้งที่ไฟทำงาน จะเพิ่มอัตราคริติคอล {2} เป็นเวลา {3} วินาที (สูงสุด {4} ชั้น)", "Deal {0}% damage. Within {1}s, each time Fire triggers, increase Critical Rate by {2} for {3}s. (max {4} stacks)"],
"Hồi N% HP mỗi N giây.": ["ฟื้นฟู HP {0}% ทุกๆ {1} วินาที", "Restore {0}% HP every {1}s."],
"Mỗi N giây, giảm kháng chí mạng của mục tiêu -N trong N giây.": ["ทุกๆ {0} วินาที ลดค่าต้านคริติคอลของเป้าหมาย -{1} เป็นเวลา {2} วินาที", "Every {0}s, reduce target's Critical Resistance by -{1} for {2}s."],
"Hồi N% HP khi bị choáng.": ["ฟื้นฟู HP {0}% เมื่อถูกทำให้มึนงง", "Restore {0}% HP when Stunned."],
"Khi HP giảm xuống dưới N%, hồi N% HP. (N lần mỗi trận)": ["เมื่อ HP ลดลงต่ำกว่า {0}% ฟื้นฟู HP {1}% ({2} ครั้งต่อการต่อสู้)", "When HP drops below {0}%, restore {1}% HP. ({2} times per battle)"],
"Khi dùng kỹ năng, có N% xác suất gây N% sát thương vụ nổ.": ["เมื่อใช้สกิล มีโอกาส {0}% ที่จะสร้างความเสียหายระเบิด {1}%", "When using a skill, {0}% chance to deal {1}% explosion damage."],
"Khi dùng kỹ năng, có N% xác suất giảm hồi chiêu của mọi kỹ năng N giây.": ["เมื่อใช้สกิล มีโอกาส {0}% ที่จะลดคูลดาวน์สกิลทั้งหมด {1} วินาที", "When using a skill, {0}% chance to reduce all skills' cooldown by {1}s."],
"Khi dùng kỹ năng, có N% xác suất đặt lại hồi chiêu của kỹ năng đó.": ["เมื่อใช้สกิล มีโอกาส {0}% ที่จะรีเซ็ตคูลดาวน์ของสกิลนั้นทันที", "When using a skill, {0}% chance to instantly reset that skill's cooldown."],
"Mỗi N đòn đánh vào cùng mục tiêu, sát thương tăng N% trong N giây. (Tối đa N cộng dồn)": ["ทุกๆ {0} ครั้งที่โจมตีเป้าหมายเดิม ความเสียหายเพิ่มขึ้น {1}% เป็นเวลา {2} วินาที (สะสมสูงสุด {3} ชั้น)", "Every {0} hits on the same target, damage increases by {1}% for {2}s. (max {3} stacks)"],
"Khi kẻ địch đỡ đòn, bỏ qua đỡ đòn tăng N% trong N giây. (Không cộng dồn)": ["เมื่อศัตรูปัดป้อง เพิ่มค่าทะลุการปัดป้อง {0}% เป็นเวลา {1} วินาที (ไม่สะสม)", "When enemy Parries, increase Parry Ignore by {0}% for {1}s. (does not stack)"],
"Trong N giây sau khi bắt đầu trận, sát thương lên kẻ địch có khiên tăng N%.": ["ภายใน {0} วินาทีหลังเริ่มการต่อสู้ ความเสียหายต่อศัตรูที่มีโล่เพิ่มขึ้น {1}%", "Within {0}s after the battle starts, damage to shielded enemies increases by {1}%."],
"Mỗi N giây, sát thương lửa tăng N% trong N giây.": ["ทุกๆ {0} วินาที ความเสียหายไฟเพิ่มขึ้น {1}% เป็นเวลา {2} วินาที", "Every {0}s, Fire Damage increases by {1}% for {2}s."],
"Khi kẻ địch bị choáng, sát thương gây ra tăng N%. (Không cộng dồn)": ["เมื่อศัตรูมึนงง ความเสียหายที่สร้างเพิ่มขึ้น {0}% (ไม่สะสม)", "When enemy is Stunned, damage dealt increases by {0}%. (does not stack)"],
"Khi HP giảm dưới N%, tỷ lệ chí mạng tăng N và sát thương chí mạng tăng N% trong N giây. (N lần mỗi trận)": ["เมื่อ HP ลดลงต่ำกว่า {0}% อัตราคริติคอลเพิ่มขึ้น {1} และความเสียหายคริติคอลเพิ่มขึ้น {2}% เป็นเวลา {3} วินาที ({4} ครั้งต่อการต่อสู้)", "When HP drops below {0}%, Critical Rate increases by {1} and Critical Damage increases by {2}% for {3}s. ({4} times per battle)"],
"Khi chết, hồi sinh với N% HP. (N lần mỗi trận)": ["เมื่อตาย จะฟื้นคืนชีพด้วย HP {0}% ({1} ครั้งต่อการต่อสู้)", "Upon death, revive with {0}% HP. ({1} times per battle)"],
"Tăng N% công lực.": ["เพิ่มพลังโจมตี {0}%", "Increase Attack Power by {0}%."],
"Tăng N trúng đích chí mạng.": ["เพิ่มค่าคำนวณคริติคอล {0}", "Increase Critical Precision by {0}."],
"Tăng N% sát thương chí mạng.": ["เพิ่มความเสียหายคริติคอล {0}%", "Increase Critical Damage by {0}%."],
"Tăng N trúng đích lửa.": ["เพิ่มค่าคำนวณไฟ {0}", "Increase Fire Precision by {0}."],
"Giảm N thời gian hồi phục tự nhiên.": ["ลดเวลาการฟื้นฟูตามธรรมชาติ {0}", "Reduce Natural Regeneration time by {0}."],
"Giảm N% thời gian hồi kỹ năng.": ["ลดเวลาคูลดาวน์สกิล {0}%", "Reduce skill cooldown time by {0}%."],
"Sát thương gây ra tăng N%.": ["ความเสียหายที่สร้างเพิ่มขึ้น {0}%", "Damage dealt increases by {0}%."],
};

const STAT_TEXT_MAP = {
"Tấn công +N%": ["โจมตี +{0}%", "Attack +{0}%"],
"Phòng thủ +N%": ["ป้องกัน +{0}%", "Defense +{0}%"],
"HP +N%": ["HP +{0}%", "HP +{0}%"],
"Tốc độ Đánh +N%": ["ความเร็วโจมตี +{0}%", "Attack Speed +{0}%"],
"Tốc độ Di chuyển +N%": ["ความเร็วเคลื่อนที่ +{0}%", "Movement Speed +{0}%"],
"Đòn Chí mạng trúng đích +N": ["ค่าคำนวณคริติคอล +{0}", "Critical Precision +{0}"],
"Sát thương Chí mạng +N%": ["ความเสียหายคริติคอล +{0}%", "Critical Damage +{0}%"],
"Chính xác +N": ["ความแม่นยำ +{0}", "Accuracy +{0}"],
"Né tránh +N": ["หลบหลีก +{0}", "Evasion +{0}"],
"Sức tấn công PvE +N%": ["พลังโจมตี PvE +{0}%", "PvE Attack Power +{0}%"],
"Phòng thủ PvE +N%": ["ป้องกัน PvE +{0}%", "PvE Defense +{0}%"],
"Sát thương Boss +N%": ["ความเสียหายบอส +{0}%", "Boss Damage +{0}%"],
"Sát thương +N%": ["ความเสียหาย +{0}%", "Damage +{0}%"],
"Sát thương nhận vào -N%": ["ความเสียหายที่ได้รับ -{0}%", "Damage Taken -{0}%"],
"Sức tấn công PvP +N%": ["พลังโจมตี PvP +{0}%", "PvP Attack Power +{0}%"],
"Phòng thủ PvP +N%": ["ป้องกัน PvP +{0}%", "PvP Defense +{0}%"],
"Kháng sát thương Chí mạng +N%": ["ต้านความเสียหายคริติคอล +{0}%", "Critical Damage Resist +{0}%"],
"Kháng sát thương Điện +N%": ["ต้านความเสียหายไฟฟ้า +{0}%", "Electric Damage Resist +{0}%"],
"Kháng sát thương Lửa +N%": ["ต้านความเสียหายไฟ +{0}%", "Fire Damage Resist +{0}%"],
"Kháng sát thương Độc +N%": ["ต้านความเสียหายพิษ +{0}%", "Poison Damage Resist +{0}%"],
"Kháng Chí mạng +N": ["ต้านคริติคอล +{0}", "Critical Resist +{0}"],
"Kháng Choáng +N%": ["ต้านมึนงง +{0}%", "Stun Resist +{0}%"],
"Kháng Sét +N": ["ต้านสายฟ้า +{0}", "Lightning Resist +{0}"],
"Kháng Lửa +N": ["ต้านไฟ +{0}", "Fire Resist +{0}"],
"Kháng Độc +N": ["ต้านพิษ +{0}", "Poison Resist +{0}"],
"Hồi chiêu Kỹ năng -N%": ["คูลดาวน์สกิล -{0}%", "Skill Cooldown -{0}%"],
"Bỏ qua đỡ đòn: +N": ["ทะลุการปัดป้อง: +{0}", "Parry Ignore: +{0}"],
"Kháng Điện Giật N": ["ต้านไฟฟ้าช็อต {0}", "Shock Resist {0}"],
"Kháng Thiêu Đốt N": ["ต้านการเผาไหม้ {0}", "Burn Resist {0}"],
"Kháng Trúng Độc N": ["ต้านพิษสะสม {0}", "Poisoned Resist {0}"],
"Hồi phục tự nhiên +N%": ["ฟื้นฟูตามธรรมชาติ +{0}%", "Natural Regen +{0}%"],
"Ô Túi đồ +N": ["ช่องกระเป๋า +{0}", "Inventory Slots +{0}"],
"Trang Kho +N": ["ช่องคลัง +{0}", "Storage Slots +{0}"],
"Tăng Giới Hạn Lưu Trữ Vàng +N": ["เพิ่มเพดานเก็บทอง +{0}", "Gold Storage Limit +{0}"],
"Số Quái cần Diệt để Triệu hồi Boss -N": ["จำนวนมอนสเตอร์ที่ต้องฆ่าเพื่อเรียกบอส -{0}", "Monsters Needed to Summon Boss -{0}"],
"Tiền tệ phân rã trang bị +N%": ["เงินสลายจากอุปกรณ์ +{0}%", "Equipment Decay Currency +{0}%"],
"Tiền tệ phân rã phụ kiện +N%": ["เงินสลายจากเครื่องประดับ +{0}%", "Accessory Decay Currency +{0}%"],
"Tiền tệ phân rã cánh +N%": ["เงินสลายจากปีก +{0}%", "Wing Decay Currency +{0}%"],
"Tiền tệ phân rã rune +N%": ["เงินสลายจากรูน +{0}%", "Rune Decay Currency +{0}%"],
"Tiền tệ phân rã pet +N%": ["เงินสลายจากสัตว์เลี้ยง +{0}%", "Pet Decay Currency +{0}%"],
"Tấn công +N": ["โจมตี +{0}", "Attack +{0}"],
"Phòng thủ +N": ["ป้องกัน +{0}", "Defense +{0}"],
"HP +N": ["HP +{0}", "HP +{0}"],
"Hồi phục tự nhiên +N": ["ฟื้นฟูตามธรรมชาติ +{0}", "Natural Regen +{0}"],
"Choáng trúng đích +N%": ["ค่าคำนวณมึนงง +{0}%", "Stun Precision +{0}%"],
"Chặn +N": ["บล็อก +{0}", "Block +{0}"],
"Sét trúng đích +N": ["ค่าคำนวณสายฟ้า +{0}", "Lightning Precision +{0}"],
"Độc trúng đích +N": ["ค่าคำนวณพิษ +{0}", "Poison Precision +{0}"],
"Lửa trúng đích +N": ["ค่าคำนวณไฟ +{0}", "Fire Precision +{0}"],
"Sát thương Điện +N%": ["ความเสียหายไฟฟ้า +{0}%", "Electric Damage +{0}%"],
"Sát thương Độc +N%": ["ความเสียหายพิษ +{0}%", "Poison Damage +{0}%"],
"Sát thương Lửa +N%": ["ความเสียหายไฟ +{0}%", "Fire Damage +{0}%"],
"Vàng từ quái +N": ["ทองจากมอนสเตอร์ +{0}", "Gold from Monsters +{0}"],
"EXP từ quái +N": ["EXP จากมอนสเตอร์ +{0}", "EXP from Monsters +{0}"],
"EXP từ boss +N": ["EXP จากบอส +{0}", "EXP from Boss +{0}"],
"Vàng từ boss +N": ["ทองจากบอส +{0}", "Gold from Boss +{0}"],
"Kháng Sát Thương Tất Cả Nguyên Tố N%": ["ต้านความเสียหายธาตุทั้งหมด {0}%", "All Elemental Damage Resist {0}%"],
"Kháng Tất Cả Nguyên Tố N": ["ต้านธาตุทั้งหมด {0}", "All Elemental Resist {0}"],
};

const DIFFICULTY_MAP = {
"Thường": ["ธรรมดา", "Normal"], "Khó": ["ยาก", "Hard"], "Rất khó": ["ยากมาก", "Very Hard"],
"Ác mộng": ["ฝันร้าย", "Nightmare"], "Địa ngục": ["นรก", "Hell"], "Tuyệt vọng": ["สิ้นหวัง", "Despair"],
"Vực thẳm": ["เหวลึก", "Abyss"], "Hỗn loạn": ["วุ่นวาย", "Chaos"], "Thảm họa": ["หายนะ", "Catastrophe"],
"Tận thế": ["วันสิ้นโลก", "Apocalypse"],
};

const AREA_MAP = {
"Lối vào tàn tích cổ đại": ["ทางเข้าซากปรักหักพังโบราณ", "Ancient Ruins Entrance"],
"Con đường sụp đổ": ["เส้นทางที่พังทลาย", "Collapsed Path"],
"Con đường cột đá": ["เส้นทางเสาหิน", "Stone Pillar Path"],
"Quảng trường phong ấn": ["จัตุรัสแห่งการผนึก", "Sealed Plaza"],
"Bàn thờ cổ đại": ["แท่นบูชาโบราณ", "Ancient Altar"],
"Hành lang sâu": ["ระเบียงลึก", "Deep Corridor"],
"Đền cổ đại": ["วิหารโบราณ", "Ancient Temple"],
"Lăng mộ nhà vua": ["สุสานกษัตริย์", "King's Tomb"],
"Phòng phong ấn": ["ห้องแห่งการผนึก", "Sealed Chamber"],
"Trung tâm tàn tích": ["ใจกลางซากปรักหักพัง", "Ruins Center"],
"Lối vào rừng": ["ทางเข้าป่า", "Forest Entrance"],
"Rừng dây leo": ["ป่าเถาวัลย์", "Vine Forest"],
"Rừng cây đại thụ": ["ป่าต้นไม้ใหญ่", "Ancient Tree Forest"],
"Thung lũng sương mù": ["หุบเขาหมอก", "Foggy Valley"],
"Đầm lầy độc": ["หนองบึงพิษ", "Poison Swamp"],
"Con đường rễ cây": ["เส้นทางรากไม้", "Root Path"],
"Rừng linh hồn": ["ป่าวิญญาณ", "Spirit Forest"],
"Rừng sâu": ["ป่าลึก", "Deep Forest"],
"Rừng sự sống": ["ป่าแห่งชีวิต", "Forest of Life"],
"Dưới Cây Thế Giới": ["ใต้ต้นไม้แห่งโลก", "Under the World Tree"],
"Lối vào nhà tù": ["ทางเข้าคุก", "Prison Entrance"],
"Khu phòng giam": ["เขตห้องขัง", "Cell Block"],
"Pháp trường": ["ลานประหาร", "Execution Ground"],
"Hành lang cổng sắt": ["ระเบียงประตูเหล็ก", "Iron Gate Corridor"],
"Phòng tra tấn": ["ห้องทรมาน", "Torture Chamber"],
"Phòng canh gác": ["ห้องยาม", "Guard Room"],
"Nhà tù phong ấn": ["คุกแห่งการผนึก", "Sealed Prison"],
"Phòng thẩm vấn": ["ห้องสอบสวน", "Interrogation Room"],
"Nhà tù dưới lòng đất": ["คุกใต้ดิน", "Underground Prison"],
"Phòng cai ngục trưởng": ["ห้องหัวหน้าคุก", "Warden's Chamber"],
"Cổng lâu đài băng": ["ประตูปราสาทน้ำแข็ง", "Ice Castle Gate"],
"Con đường tuyết": ["เส้นทางหิมะ", "Snow Path"],
"Hành lang băng": ["ระเบียงน้ำแข็ง", "Ice Corridor"],
"Khu vườn băng giá": ["สวนน้ำแข็ง", "Frozen Garden"],
"Đại sảnh pha lê": ["ห้องโถงคริสตัล", "Crystal Hall"],
"Hành lang sương giá": ["ระเบียงน้ำค้างแข็ง", "Frost Corridor"],
"Con đường ngai vàng": ["เส้นทางสู่บัลลังก์", "Throne Path"],
"Đại sảnh băng": ["ห้องโถงน้ำแข็ง", "Ice Hall"],
"Ngai vàng băng giá": ["บัลลังก์น้ำแข็ง", "Frozen Throne"],
"Phòng của nhà vua": ["ห้องกษัตริย์", "King's Chamber"],
};

// ---------- template substitution engine ----------
function toPattern(text) {
  return text.replace(/[0-9]+([.,][0-9]+)?/g, "N");
}
function extractNumbers(text) {
  return (text.match(/[0-9]+([.,][0-9]+)?/g) || []);
}
function fillTemplate(tpl, nums) {
  return tpl.replace(/\{(\d+)\}/g, (_, i) => nums[+i] !== undefined ? nums[+i] : "?");
}
// translate(viText, map) -> {th, en} ; falls back to the original Vietnamese
// (flagged) if a pattern isn't in the map yet, rather than inventing text.
function translate(viText, map) {
  if (!viText) return { th: "", en: "" };
  const pattern = toPattern(viText);
  const hit = map[pattern];
  if (!hit) return { th: viText + " [ยังไม่แปล]", en: viText + " [untranslated]" };
  const nums = extractNumbers(viText);
  return { th: fillTemplate(hit[0], nums), en: fillTemplate(hit[1], nums) };
}
function translateSimple(viText, map) {
  const hit = map[viText];
  if (!hit) return { th: viText, en: viText };
  return { th: hit[0], en: hit[1] };
}

const SLOT_MAP = {
"Vũ khí chính": ["อาวุธหลัก", "Main Weapon"], "Vũ khí phụ": ["อาวุธรอง", "Sub Weapon"],
"Nón / Mũ": ["หมวก", "Helmet"], "Áo giáp": ["เกราะ", "Armor"], "Găng tay": ["ถุงมือ", "Gloves"],
"Giày / Ủng": ["รองเท้า", "Boots"], "Áo choàng": ["เสื้อคลุม", "Cloak"], "Giáp vai": ["เกราะไหล่", "Shoulder Armor"],
"Nhẫn": ["แหวน", "Ring"], "Khuyên tai": ["ต่างหู", "Earring"], "Dây chuyền": ["สร้อยคอ", "Necklace"],
"Vòng tay": ["กำไลข้อมือ", "Bracelet"], "Dây thắt lưng": ["เข็มขัด", "Belt"], "Trâm cài / Huy hiệu": ["เข็มกลัด/ตรา", "Brooch/Badge"],
};

const JEWEL_DESC_MAP = {
"EXP cần thiết để tăng Cấp Tổng Hợp Ngọc.": ["EXP ที่ต้องใช้เพื่อเพิ่มระดับการสังเคราะห์อัญมณี", "EXP required to increase Jewel Synthesis Level."],
"Có thể gắn vào vũ khí và vũ khí phụ tại Thợ Rèn để nhận thêm chỉ số.": ["สามารถฝังลงอาวุธหลักและอาวุธรองที่ช่างตีเหล็กเพื่อรับค่าสถานะเพิ่ม", "Can be equipped on weapons and secondary weapons at the Blacksmith to add bonus stats."],
"Có thể gắn vào giáp tại Thợ Rèn để nhận thêm chỉ số.": ["สามารถฝังลงเกราะที่ช่างตีเหล็กเพื่อรับค่าสถานะเพิ่ม", "Can be equipped on armor at the Blacksmith to add bonus stats."],
"Có thể gắn vào phụ kiện tại Thợ Rèn để nhận thêm chỉ số.": ["สามารถฝังลงเครื่องประดับที่ช่างตีเหล็กเพื่อรับค่าสถานะเพิ่ม", "Can be equipped on accessories at the Blacksmith to add bonus stats."],
"Có thể gắn vào vũ khí, vũ khí phụ, giáp và phụ kiện tại Thợ Rèn để nhận thêm chỉ số.": ["สามารถฝังลงอาวุธหลัก อาวุธรอง เกราะ และเครื่องประดับที่ช่างตีเหล็กเพื่อรับค่าสถานะเพิ่ม", "Can be equipped on weapons, secondary weapons, armor, and accessories at the Blacksmith to add bonus stats."],
};
const JEWEL_GRADE_MAP = {
"Cấp Thấp (1★)": ["ระดับต่ำ (1★)", "Low-Grade (1★)"], "Cấp Trung (2★)": ["ระดับกลาง (2★)", "Mid-Grade (2★)"],
"Cấp Cao (3★)": ["ระดับสูง (3★)", "High-Grade (3★)"], "Cao Cấp (4★)": ["ขั้นสูง (4★)", "Advanced (4★)"],
"Đặc Biệt (5★)": ["พิเศษ (5★)", "Special (5★)"], "Thượng Hạng (6★)": ["ชั้นเลิศ (6★)", "Superior (6★)"],
};
const JEWEL_CATEGORY_MAP = {
"Ngọc Phụ Kiện": ["อัญมณีเครื่องประดับ", "Accessory Jewel"], "Ngọc Vũ Khí": ["อัญมณีอาวุธ", "Weapon Jewel"],
"Ngọc Giáp": ["อัญมณีเกราะ", "Armor Jewel"], "Ngọc Mana / Bổ Trợ": ["อัญมณีมานา/สนับสนุน", "Mana/Support Jewel"],
};

// ---------- load raw tables ----------
const jewelDatabase = load("jewelDatabase", "data_jewelDatabase.js");
const skillTrees = load("skillTrees", "data_skillTrees.js");
const trainingSkills = load("trainingSkills", "data_trainingSkills.js");
const equipments = load("equipments", "data_equipments.js");
const stageData = load("stageData", "data_stageData.js");
const steamMarketPrices = load("steamMarketPrices", "data_steamMarketPrices.js");

// Equipment items below Tier 3 aren't tradable on Steam in this game, so the
// price table only has entries from Tier 3 up, keyed "<name> (Tier N)".
function getEquipSteamPrice(e) {
  if (e.tier < 3) return null;
  const key = `${e.name_en} (Tier ${e.tier})`;
  return steamMarketPrices[key] || null;
}
equipments.forEach(e => {
  const m = getEquipSteamPrice(e);
  e.steam_price_usd = m ? m.price_usd : null;
  e.steam_price_text = m ? m.price_text : null;
  e.steam_listings = m ? m.listings : 0;
  e.steam_url = `https://steamcommunity.com/market/search?appid=4891320&q=${encodeURIComponent(e.name_en)}`;
});

const BRANCH_TITLE_MAP = {
"Nhánh 1: Tấn Công Đơn Mục Tiêu": ["สายที่ 1: โจมตีเป้าหมายเดี่ยว", "Branch 1: Single-Target Attack"],
"Nhánh 2: Tấn Công Diện Rộng (AoE)": ["สายที่ 2: โจมตีพื้นที่ (AoE)", "Branch 2: Area Attack (AoE)"],
"Nhánh 3: Cường Hóa Công & Tốc": ["สายที่ 3: เสริมโจมตีและความเร็ว", "Branch 3: Attack & Speed Enhancement"],
"Nhánh 4: Phòng Thủ & Chống Chịu": ["สายที่ 4: ป้องกันและความอึด", "Branch 4: Defense & Survivability"],
"Nhánh 5: Đa Năng, Hồi Phục & Bổ Trợ": ["สายที่ 5: อเนกประสงค์ ฟื้นฟู และสนับสนุน", "Branch 5: Versatile, Recovery & Support"],
};

// ---------- transform ----------
Object.values(skillTrees).forEach(cls => {
  cls.branches.forEach(b => {
    const bt = translateSimple(b.branch_title, BRANCH_TITLE_MAP);
    b.branch_title_th = bt.th; b.branch_title_en = bt.en;
    b.skills.forEach(sk => {
      if (sk.pre_req && sk.pre_req.parent_name) {
        sk.pre_req.parent_name_th = sk.pre_req.parent_name; // skill names already read as English
        sk.pre_req.parent_name_en = sk.pre_req.parent_name;
      }
      sk.levels.forEach(lv => {
        const t = translate(lv.description, SKILL_DESC_MAP);
        lv.description_th = t.th;
        lv.description_en = t.en;
      });
    });
  });
});

trainingSkills.forEach(t => {
  t.levels.forEach(lv => {
    (lv.stats || []).forEach(s => {
      const tr = translate(s.text, STAT_TEXT_MAP);
      s.text_th = tr.th;
      s.text_en = tr.en;
    });
  });
});

equipments.forEach(e => {
  (e.stats || []).forEach(s => {
    const tr = translate(s.text, STAT_TEXT_MAP);
    s.text_th = tr.th;
    s.text_en = tr.en;
  });
  const sl = translateSimple(e.slot_name, SLOT_MAP);
  e.slot_name_th = sl.th; e.slot_name_en = sl.en;
});

stageData.forEach(s => {
  const d = translateSimple(s.difficulty, DIFFICULTY_MAP);
  const a = translateSimple(s.area_name, AREA_MAP);
  s.difficulty_th = d.th; s.difficulty_en = d.en;
  s.area_name_th = a.th; s.area_name_en = a.en;
  s.display_tag_th = `${s.chapter_stage} ${d.th}`;
  s.display_tag_en = `${s.chapter_stage} ${d.en}`;
  s.display_full_th = `${s.display_tag_th} (${a.th})`;
  s.display_full_en = `${s.display_tag_en} (${a.en})`;
});

// jewelDatabase & equipments already carry _vi/_en pairs for name/desc/category/grade
// from the source data itself - only add a `_th` where we have real translations;
// otherwise fall back to English (a proper noun in English reads fine to a Thai
// player - matches how the boss's own game client shows skill names).
const JEWEL_OPTION_NAME_MAP = {
  "Tấn công": "โจมตี", "Sát thương Chí mạng": "ความเสียหายคริติคอล", "Sát thương": "ความเสียหาย",
  "Sát thương Boss": "ความเสียหายบอส", "Sát thương Điện": "ความเสียหายไฟฟ้า", "Sát thương Độc": "ความเสียหายพิษ",
  "Sát thương Lửa": "ความเสียหายไฟ", "Phòng thủ": "ป้องกัน", "Kháng sát thương Chí mạng": "ต้านความเสียหายคริติคอล",
  "HP": "HP", "Sát thương nhận vào": "ความเสียหายที่ได้รับ", "Kháng sát thương Điện": "ต้านความเสียหายไฟฟ้า",
  "Kháng sát thương Độc": "ต้านความเสียหายพิษ", "Kháng sát thương Lửa": "ต้านความเสียหายไฟ",
  "Kháng Sát Thương Tất Cả Nguyên Tố": "ต้านความเสียหายธาตุทั้งหมด", "Tốc độ Đánh": "ความเร็วโจมตี",
  "Chính xác": "ความแม่นยำ", "Đòn Chí mạng trúng đích": "ค่าคำนวณคริติคอล", "Hồi phục tự nhiên": "ฟื้นฟูตามธรรมชาติ",
  "Sét trúng đích": "ค่าคำนวณสายฟ้า", "Độc trúng đích": "ค่าคำนวณพิษ", "Lửa trúng đích": "ค่าคำนวณไฟ",
  "Tốc độ Di chuyển": "ความเร็วเคลื่อนที่", "Né tránh": "หลบหลีก", "Kháng Chí mạng": "ต้านคริติคอล",
  "Kháng Choáng": "ต้านมึนงง", "Kháng Sét": "ต้านสายฟ้า", "Kháng Độc": "ต้านพิษ", "Kháng Lửa": "ต้านไฟ",
  "Kháng Tất Cả Nguyên Tố": "ต้านธาตุทั้งหมด", "Cấp yêu cầu của Trang bị": "เลเวลที่ต้องการของอุปกรณ์",
  "Tỷ lệ rơi trang bị": "อัตราดรอปอุปกรณ์", "Lượng Vàng Nhận Được": "ปริมาณทองที่ได้รับ", "Lượng EXP Nhận Được": "ปริมาณ EXP ที่ได้รับ",
};
jewelDatabase.forEach(j => {
  j.name_th = j.name_en; // proper nouns - already English-style in-game, reads fine to a Thai player
  j.desc_th = translateSimple(j.desc_vi, JEWEL_DESC_MAP).th;
  j.grade_name_th = translateSimple(j.grade_name_vi, JEWEL_GRADE_MAP).th;
  j.category_th = translateSimple(j.category_vi, JEWEL_CATEGORY_MAP).th;
  (j.options || []).forEach(o => {
    const nameTh = JEWEL_OPTION_NAME_MAP[o.name_vi] || o.name_en;
    o.text_th = `${nameTh}: +${o.min}${o.unit} ~ +${o.max}${o.unit}`;
  });
});
equipments.forEach(e => { e.name_th = e.name_en; });
trainingSkills.forEach(t => { t.name_th = t.name_en; });
Object.values(skillTrees).forEach(cls => {
  cls.branches.forEach(b => b.skills.forEach(sk => { sk.name_th = sk.name_en; }));
});

// ---------- coverage report ----------
let untranslated = 0, total = 0;
Object.values(skillTrees).forEach(cls => cls.branches.forEach(b => b.skills.forEach(sk => sk.levels.forEach(lv => {
  total++; if (lv.description_th && lv.description_th.includes("[ยังไม่แปล]")) untranslated++;
}))));
console.log(`Skill descriptions: ${total - untranslated}/${total} translated.`);

let statTotal = 0, statMiss = 0;
trainingSkills.forEach(t => t.levels.forEach(lv => (lv.stats||[]).forEach(s => { statTotal++; if (s.text_th && s.text_th.includes("[ยังไม่แปล]")) statMiss++; })));
equipments.forEach(e => (e.stats||[]).forEach(s => { statTotal++; if (s.text_th && s.text_th.includes("[ยังไม่แปล]")) statMiss++; }));
console.log(`Stat lines: ${statTotal - statMiss}/${statTotal} translated.`);

// ---------- write output ----------
const out = `// AUTO-GENERATED by tools/build_data.js — do not hand-edit.
// Source: publicly-viewable game-mechanics data (not the reference site's own
// design/branding), translated to Thai/English via template substitution.
const GAME_DATA = {
  skillTrees: ${JSON.stringify(skillTrees)},
  trainingSkills: ${JSON.stringify(trainingSkills)},
  equipments: ${JSON.stringify(equipments)},
  jewelDatabase: ${JSON.stringify(jewelDatabase)},
  stageData: ${JSON.stringify(stageData)}
};
`;
fs.writeFileSync(OUT, out, "utf8");
console.log("Wrote", OUT, (out.length/1024).toFixed(0) + "KB");
