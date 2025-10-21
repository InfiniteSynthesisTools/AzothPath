import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores';
import MainLayout from '@/layouts/MainLayout.vue';
// 冰柱图页面 - 使用懒加载
const IcicleChartView = () => import('@/views/IcicleChartView.vue');

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
        path: '/import',
        name: 'Import',
        component: () => import('@/views/Import.vue'),
        meta: { title: '导入配方', requiresAuth: true }
      },
      {
        path: '/import-tasks',
        name: 'ImportTasks',
        component: () => import('@/views/ImportTasks.vue'),
        meta: { title: '导入任务', requiresAuth: true }
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
        redirect: () => {
          const userStore = useUserStore();
          if (userStore.userInfo?.id) {
            return { path: `/profile/${userStore.userInfo.id}` };
          }
          // 未登录时显示一个通用的个人中心页面，而不是跳转到登录
          return { path: '/profile/0' };
        }
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
      },
      {
        path: '/elements',
        name: 'ElementList',
        component: () => import('@/views/ElementList.vue'),
        meta: { title: '元素列表' }
      },
      {
        path: '/element/:id',
        name: 'ElementDetail',
        component: () => import('@/views/ElementDetail.vue'),
        meta: { title: '元素详情' }
      },
      {
        path: '/graph',
        name: 'GraphView',
        component: () => import('@/views/GraphView.vue'),
        meta: { title: '总图显示' }
      },
      {
        path: '/icicle-chart',
        name: 'IcicleChart',
        component: IcicleChartView,
        meta: {
          title: '冰柱图',
          requiresAuth: false
        }
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
router.beforeEach((to, _, next) => {
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
