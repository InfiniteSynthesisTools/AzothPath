const { database } = require('./dist/database/connection');

async function updateGemItem() {
  try {
    await database.run('UPDATE items SET is_base = 0 WHERE name = ?', ['宝石']);
    console.log('✅ 已更新"宝石"为非基础材料');
    
    // 验证更新结果
    const gemItem = await database.get('SELECT name, is_base FROM items WHERE name = ?', ['宝石']);
    console.log('验证结果:', gemItem);
  } catch (error) {
    console.error('更新失败:', error);
  }
}

updateGemItem();
