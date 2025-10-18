import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// 从 backend/src/database/init.ts 到项目根目录是 ../../../
const PROJECT_ROOT = path.join(__dirname, '../../../');
const DB_PATH = process.env.DB_PATH 
  ? path.join(PROJECT_ROOT, process.env.DB_PATH)
  : path.join(PROJECT_ROOT, 'database/azothpath.db');
const INIT_SQL_PATH = path.join(PROJECT_ROOT, 'database/init.sql');

async function initDatabase(force: boolean = false) {
  console.log('🔧 Initializing database...');
  console.log(`📁 Database path: ${DB_PATH}`);
  
  // 确保数据库目录存在
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ Created database directory: ${dbDir}`);
  }

  // 如果强制重建，删除旧数据库
  if (force && fs.existsSync(DB_PATH)) {
    console.log('🗑️  Force mode: Deleting existing database...');
    fs.unlinkSync(DB_PATH);
    console.log('✅ Old database deleted');
  }

  // 读取初始化SQL
  const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');

  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }

      console.log('✅ Database file opened');

      // 执行初始化SQL
      db.exec(initSQL, (err) => {
        if (err) {
          console.error('❌ Error executing init SQL:', err);
          db.close();
          reject(err);
          return;
        }

        console.log('✅ Database tables created successfully');

        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err);
            reject(err);
          } else {
            console.log('🎉 Database initialization complete!');
            resolve();
          }
        });
      });
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  // 检查命令行参数
  const forceMode = process.argv.includes('--force') || process.argv.includes('-f');
  
  if (forceMode) {
    console.log('⚠️  Force mode enabled - existing database will be deleted!');
  }
  
  initDatabase(forceMode)
    .then(() => {
      console.log('✨ All done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Initialization failed:', err);
      process.exit(1);
    });
}

export default initDatabase;
