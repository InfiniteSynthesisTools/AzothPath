# Azoth Path - AI Agent Instructions

## Project Overview
**Azoth Path（无尽合成工具站）** is a community-driven web tool for the game "Infinite Craft", helping players discover and share item synthesis recipes. The system validates recipes through external game API and rewards users for discovering new synthesis paths.

## Architecture

### Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia (state management) + Element Plus/Naive UI
- **Backend**: Node.js + Express/Fastify + TypeScript
- **Database**: SQLite (no foreign keys by design - application-layer integrity)
- **ORM**: Prisma or TypeORM for type-safe database access

### Core Components
```
/frontend - Vue 3 SPA with Composition API
/backend - RESTful API server with async task processing
/database - SQLite file (azothpath.db) with WAL mode enabled
recipe_calculator.py - Python utility for path optimization (legacy/standalone)
```

## Database Design Philosophy

### No Foreign Keys Rule
**Critical**: All tables use auto-increment INTEGER primary keys WITHOUT foreign key constraints. Data integrity is managed at the application layer for flexibility.

### Core Tables Structure
1. **recipes** - Main synthesis records (item_a + item_b = result)
   - Enforces `item_a < item_b` (lexical order) via CHECK constraint
   - UNIQUE constraint on (item_a, item_b) to prevent duplicates
   
2. **items** - Dictionary of all game items (自动收录 from API validation)
   
3. **user** - User accounts with contribution scoring
   
4. **task** - Bounty system for undiscovered recipes
   
5. **import_tasks** - Batch import job summary (汇总表)
   - Status: processing → completed/failed
   - Counters: total_count, success_count, failed_count, duplicate_count
   
6. **import_tasks_content** - Individual recipe entries per import job (明细表)
   - Links to parent task via `task_id` (INTEGER, not UUID)
   - Status flow: pending → processing → success/failed/duplicate

### Key Design Decisions
- **Dictionary ordering**: `item_a` always < `item_b` to deduplicate "A+B=C" and "B+A=C"
- **Async processing**: Batch imports create task records first, then process items asynchronously
- **No cascading deletes**: Application handles cleanup logic explicitly

## Data Flow & Processing

### Recipe Submission Flow
```
1. User submits (text "A+B=C" or JSON batch)
2. Create import_tasks record (返回 taskId)
3. Parse & create import_tasks_content entries (status: pending)
4. Background queue processes each entry:
   - Update status → processing
   - Call external validation API
   - Check duplicates in recipes table
   - Update status → success/failed/duplicate
   - Update parent task counters in real-time
5. When all items processed → import_tasks.status = completed
```

### External API Integration
- **Validation endpoint**: Verifies if recipe is valid in game
- **Error handling**: 
  - Status 400/403 → immediate failure (discard)
  - Other errors → log to error_message, allow retry
- **Auto-discovery**: New items from API automatically added to `items` table

### Task/Bounty System
Tasks auto-generate when:
1. Recipe successfully added (A+B=C)
2. Item A or B has no recipe (not in recipes.result)
3. Item is not base element (金木水火土)
4. No active task exists for that item

## Code Conventions

### TypeScript Types Pattern
```typescript
// Always define interfaces for database entities
export interface ImportTask {
  id: number;  // Auto-increment, never UUID
  user_id: number;
  total_count: number;
  // ... mirrors database exactly
}

// API responses wrap data
return request.get<{ tasks: ImportTask[]; total: number }>('/api/import-tasks');
```

### API Structure
- **Public routes**: `/api/recipes` (GET list/detail, path search)
- **Authenticated routes**: POST/DELETE operations require `authMiddleware`
- **Naming**: Use `taskId` (number) not `task_id` in URLs: `/api/import-tasks/${taskId}`

### Frontend State Management
```typescript
// Pinia stores mirror backend entities
stores/
  ├── user.ts - Authentication & user profile
  ├── recipe.ts - Recipe CRUD & search
  └── task.ts - Task/bounty management
```

## Critical Developer Workflows

### Database Initialization
```bash
cd backend
npm run db:init  # Creates tables from schema
```

### Development Servers
```bash
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### SQLite Configuration
```typescript
// Always use these pragma settings
journal_mode: 'WAL'        // Concurrent reads/writes
synchronous: 'NORMAL'      // Balance safety/performance
cache_size: -2000          // 8MB cache
busy_timeout: 5000         // Handle lock contention
```

## Search & Path Optimization

### "最简路径" Algorithm (from recipe_calculator.py)
Ranking criteria (in order):
1. **深度最小** - Fewest synthesis steps
2. **宽度最小** - Fewest total recipes needed
3. **广度最大** - Most base materials used
4. **字典序** - Lexical order as tiebreaker

Implementation uses BFS with cycle detection for items like "A+A=A".

## Security & Validation

### Password Handling
- Use bcrypt for hashing (stored in `user.psw`)
- JWT tokens for session management

### Input Validation
- **Both** frontend AND backend validation required
- Rate limiting on API endpoints to prevent abuse
- ORM parameterized queries to prevent SQL injection

## Common Pitfalls

1. **Don't create foreign keys** - This is by design for operational flexibility
2. **Always normalize recipes** - Ensure `item_a < item_b` before insertion
3. **taskId is number, not string** - Changed from UUID to auto-increment
4. **Check import_tasks_content.task_id** - Links to parent task for batch operations
5. **Update parent task counters** - When processing content, update import_tasks aggregates

## File References
- `prd.md` - Complete product requirements and technical specifications
- `recipe_calculator.py` - Path optimization algorithms (Python, standalone utility)
- Section 4.2.4 in prd.md - Complete SQL schema with indexes
- Section 4.3 in prd.md - Frontend architecture and type definitions
- Section 4.4 in prd.md - Backend architecture and API endpoints

## Questions to Clarify
- Is recipe_calculator.py integrated with the main app or standalone tool?
- What's the actual external validation API endpoint?
- Should we implement the Redis caching layer mentioned in prd.md?
