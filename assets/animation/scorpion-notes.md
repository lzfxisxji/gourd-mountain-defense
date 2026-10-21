# 蝎子大王

按用户参考图制作：紫色甲胄、双钳冠、蓝色花纹领甲、大刀与红色蝎钩。原参考保存于 assets/sprites/scorpion-reference.png。

最终图集 scorpion-poses.png 为透明 RGBA，1821×864，包含行走持刀、举刀蓄力、向左挥砍三种姿态。由内置 imagegen 生成；原始输出 exec-a999da8a-50dc-4b3f-85d6-076a8b9208b7.png，重新布局输出 exec-35585c39-a6c6-413f-b222-eaf279086776.png。运行时以源矩形和多边形剪裁分别绘制姿态，隔离宽幅刀刃与相邻姿态。

生命 2000，移动速度 8（青蛙精 17）。近身举刀 0.9 秒后单次造成 2000 伤害，攻击周期 3 秒。水弹减慢移动与攻击计时；普通技能伤害规则照常，无额外爆炸抗性。三娃满血 4000，连续两刀击败。1-9、1-10 各替换两只后段普通妖怪，总出怪数和时间不变。图鉴、选卡预览、倒地效果和攻击阶段存档均已接入。

## 初次生成提示词

Create a transparent 2D game sprite atlas of Scorpion King 蝎子大王 from classic Chinese animation 葫芦兄弟, faithfully matching attached reference. Broad muscular dark purple segmented armor/body, menacing blue face with red mouth and fangs, two huge pale blue spotted horn/pincer shapes framing head, ornate bright blue curved collar with gold dotted trim, gold wrist cuffs, brown/orange short skirt panels, blue waist buckle, stout purple legs and pointed boots, curved segmented scorpion tail ending red stinger. Holds a huge broad curved STEEL BLUE SABER (single edged, crescent tip), NOT a spear. Three separate FULL BODY poses in ONE horizontal row, equal cells, wide 1774x887 atlas. All face LEFT toward defenders. Cell1 slow walking guard with sword raised, cell2 obvious windup saber held overhead behind shoulder, cell3 completed downward LEFT slash with saber extended toward left low and bent knees. The weapon arm must visibly change angle between all poses. Same character scale, ground baseline y=800, entire horns, sword, boots and tail inside each cell, 7% margin, absolutely no overlaps or cropped blades. Thick clean dark ink outlines, flat cel painted colors, Chinese traditional cartoon style, strong recognizable silhouette matching reference. TRUE TRANSPARENT background outside character, no black or white background, no shadow, no text, no watermark, no effects or slash arcs. Reference image is appearance guidance only.

## 布局调整

要求三个姿态分别留在等宽独立区域，保持相同头部比例、全部武器可见、朝左、透明背景。最终使用经检查的源坐标与多边形裁剪保留完整人物轮廓。
