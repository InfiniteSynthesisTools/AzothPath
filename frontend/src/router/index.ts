import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores';
import MainLayout from '@/layouts/MainLayout.vue';

// 路由配置
const routes: RouteRecordRaw[] = [
  // 带导航栏的主要页面（使用 MainLayout）
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: '/recipes',
        name: 'RecipeList',
        component: () => import('@/views/RecipeList.vue'),
        meta: { title: '配方列表' }
      },
      {
        path: '/recipes/:id',
        name: 'RecipeDetail',
        component: () => import('@/views/RecipeDetail.vue'),
        meta: { title: '配方详情' }
      },
      {
        path: '/import',
        name: 'Import',
        component: () => import('@/views/Import.vue'),
        meta: { title: '导入配方', requiresAuth: true }
      },
      {
        path: '/tasks',
        name: 'TaskBoard',
        component: () => import('@/views/TaskBoard.vue'),
        meta: { title: '任务看板' }
      },
      {
        path: '/contribution',
        name: 'Contribution',
        component: () => import('@/views/Contribution.vue'),
        meta: { title: '贡献榜' }
      },
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心', requiresAuth: true }
      },
      {
        path: '/profile/:id',
        name: 'UserProfile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '用户主页' }
      },
      {
        path: '/admin',
        name: 'Admin',
        component: () => import('@/views/Admin.vue'),
        meta: { title: '管理后台', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: '/about',
        name: 'About',
        component: () => import('@/views/About.vue'),
        meta: { title: '关于我们' }
      }
    ]
  },
  // 独立页面（不使用 MainLayout）
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '404' }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - Azoth Path` : 'Azoth Path - 无尽合成工具站';

  const userStore = useUserStore();

  // 检查是否需要登录
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    });
    return;
  }

  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next({
      name: 'Home'
    });
    return;
  }

  // 如果已登录，不允许访问登录/注册页
  if ((to.name === 'Login' || to.name === 'Register') && userStore.isLoggedIn) {
    next({
      name: 'Home'
    });
    return;
  }

  next();
});

export default router;
