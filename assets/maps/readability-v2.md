# 第一章地图清晰度调整 v2

素材：chapter-01-wood-clean-v2.png，使用内置 image_gen 基于 chapter-01-wood.png 编辑。原版素材保留。

调整草坪内纹理、细碎装饰及深浅反差；保留五行九列边界与外围葫芦山场景。游戏继续使用同一 GRID 坐标。

完整提示词：

Edit this existing game map. Keep EXACT camera, composition, image size, cottage, mountains, vines, fences, enemy entry dirt path, and grass field boundaries. Only simplify the CENTRAL RECTANGULAR PLAYING LAWN at approximately x=337 to1453 and y=280 to860 of 1672x941 image. Keep five rows and nine columns with exact unchanged tile positions. Reduce the dark/light checkerboard contrast by about 60%, make all tiles similar soft pale jade-green with only a gentle alternating tint so grid remains subtly readable. Remove almost all tiny flowers, stone chips, bright grass tufts, high-frequency marks inside planting tiles; keep subtle handpainted gouache texture and a few soft broad grass washes. Tiles should be quiet, flat and lighter, giving black-outlined characters strong separation. Keep the field's outer grass border organic and softly uneven, preserve its exact rectangular location and dimensions. Keep scenery around perimeter as beautifully detailed as original, do not simplify cottage or mountains. No characters, HUD, gourds, text, or added objects. Maintain classic Chinese handpainted cartoon style.

角色世界绘制倍率位于 src/animation.js 的 WORLD_SCALE，四娃与葫芦藤为 1.18，三娃与青蛙精为 1.12；脚底锚点和判定格子未修改。卡片使用头部与上半身取景，头像、名称和费用分行排布，冷却和资源不足使用不同状态提示。

