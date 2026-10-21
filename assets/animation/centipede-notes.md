# 蜈蚣精

用户参考图保存在 assets/sprites/centipede-reference.png。保留红色脸谱、绿色肩甲、浅色腹部与紫色背甲、金色侧足、双斧、红色长腿和尾部。

图集 centipede-poses.png：1536×1024，RGBA，行走与挥斧两个姿态。内置 imagegen 初次输出 exec-d74b3e07-85b7-4104-a13b-4999260a678c.png，经透明边缘与布局调整后采用 exec-66d3ab2f-2ec6-4872-8653-0bb4627d21dc.png。运行时使用源矩形与多边形裁剪隔离相邻姿态，保留原图透明通道。

规则：600 生命，速度 18，挥斧每次 200 伤害，每秒一次，0.42 秒命中。生命降至 300 或以下且存活时，形象宽高变为原来的 2 倍，移动速度提高为 22.5（1.25 倍）；伤害及攻击间隔不增加，水弹减速照常。变大状态和攻击阶段通过战局存档恢复，倒地保持死亡前的体型。1-8、1-9、1-10 各替换两只普通妖怪，总出怪数及时间不变。

## 原始生成提示词

Create transparent 2D sprite atlas based faithfully on supplied classic Chinese animation centipede demon 蜈蚣精 reference. TWO isolated full-body poses side by side, canvas1536x1024, EACH entire figure inside its own equal 768wide cell with 70px blank margins. Both FACE LEFT. Tall slender curved segmented centipede body, dark purple back plates, ivory square segmented belly and neck, many small gold/yellow spikes/legs along body, red skinny legs with black feet, red elongated oval face with big oval eyes, light red forehead markings, black striped hood sides, green tiled shoulder armor with pale gold edges, thin ochre long arms, TWO purple-handled broad crescent silver-blue AXES (one per hand), small pointed red tail. Faithfully preserve reference silhouette and colors, not muscular scorpion and not generic human warrior. Left pose idle walking, front axe held low diagonally LEFT and rear axe behind. Right pose active chop, front axe extends LEFT horizontally/downward, rear axe above shoulder with elbows visibly different. Feet baseline y940. Same head/body scale both cells. All axes, antennae, tail, feet fully inside own cell, no overlap. Clean dark ink outlines, flat cel painted Chinese cartoon colors, transparent alpha outside figures, no black background, no shadows, text, effects, logos or watermark.

## 调整提示

移除背景、彩色雾气与光晕，外轮廓外及肢体之间保持真正透明 alpha；缩小两个人物并增加中央空隙，完整保留斧头、尾部和脚部。
