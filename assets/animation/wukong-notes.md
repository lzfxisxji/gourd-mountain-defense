# 孙悟空素材与玩法

按用户提供的两张《大闹天宫》孙悟空参考图生成透明三姿态图集，保留黄衣、红裤、浅蓝围巾及红金金箍棒。参考原图保存于 assets/sprites/wukong-reference-1.png 和 wukong-reference-2.png。

输出：wukong-poses.png，1774×887，透明 RGBA，依次为待机、蓄力、投掷后姿态。飞行与驻留金箍棒由 Canvas 绘制。

商店永久解锁价格 20000 金币；部署 300 灵气。存在本行前方目标时每 5 秒投棒，命中后驻留在命中位置 5 秒，每隔 1 秒对同路线附近目标造成 50 伤害，共 5 次；目标提前死亡后驻留效果继续。首次伤害发生在命中后 1 秒，不额外附加撞击伤害。

## 生成提示词

Create a transparent 2D sprite atlas of Sun Wukong Monkey King 孙悟空 based faithfully on the TWO supplied classic Chinese animation reference images. Preserve white monkey face with red mask-like markings and green eyebrow details, yellow cap, long light cyan scarf tied at neck, cropped yellow jacket, white waist belt, red short overskirt with black dots, RED trousers, black boots, brown hands, RED staff with GOLD ends. THREE separate isolated full-body poses in one wide horizontal image 1774x887, exactly 3 equal cells, all face RIGHT. Pose1 idle holds red/gold staff upright close to body, playful confident monkey posture; pose2 winds up to THROW the staff, torso twists, staff held diagonally but entirely inside his cell; pose3 throwing FOLLOW THROUGH right arm extended, empty hand, staff has already left (do NOT include a separate flying staff). Same character proportions and consistent head scale, feet baseline y800. Entire head, scarf, tail if present, boots and staff must fit inside each cell with at least 7% blank margin, no overlap. Authentic Chinese cel cartoon clean ink outlines, flat painted colors, not realistic fur, not 3D, not modern game armor. TRUE transparent alpha, no shadows, no glow, no effects, no scenery, no text, no watermark.
