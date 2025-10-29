<template>
  <div class="register-page">
    <el-card class="register-card">
      <template #header>
        <div class="card-header">
          <el-button class="back-home" text @click="router.push('/')">
            返回首页
          </el-button>
          <h2>📝 用户注册</h2>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="username">
          <el-input 
            v-model="form.username" 
            placeholder="用户名" 
            @keyup.enter="handleEnterKey"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="密码" 
            show-password 
            @keyup.enter="handleEnterKey"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="确认密码" 
            show-password 
            @keyup.enter="handleEnterKey"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleRegister" style="width: 100%">
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer">
        已有账号？ <router-link to="/login">立即登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const form = ref({ username: '', password: '', confirmPassword: '' });
const formRef = ref();
const loading = ref(false);

// 自定义验证器：确认密码
const validateConfirmPassword = (_rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== form.value.password) {
    callback(new Error('两次输入密码不一致'));
  } else {
    callback();
  }
};

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, message: '用户名只能包含字母、数字、下划线和中文', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
};

const handleEnterKey = () => {
  if (form.value.username && form.value.password && form.value.confirmPassword) {
    handleRegister();
  }
};

const handleRegister = async () => {
  try {
    await formRef.value.validate();
    loading.value = true;
    
    await userStore.register(form.value);
    ElMessage.success('注册成功！');
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (error: any) {
    ElMessage.error(error.message || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-page {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 400px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  transition: all var(--transition-base);
}

.register-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-accent);
}

.register-card :deep(.el-card__header) {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--color-border-primary);
  background: transparent;
}

.register-card :deep(.el-card__body) {
  padding: 24px;
}

h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.back-home {
  position: absolute;
  left: 0;
  top: 0;
}

.footer {
  text-align: center;
  margin-top: 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.footer a {
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: 600;
  transition: all var(--transition-base);
}

.footer a:hover {
  color: var(--color-primary-700);
  text-decoration: underline;
  transform: translateY(-1px);
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-primary);
  transition: all var(--transition-base);
}

:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--color-border-accent);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}

:deep(.el-button) {
  border-radius: var(--radius-lg);
  font-weight: 600;
  height: 44px;
  transition: all var(--transition-base);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  border: none;
  box-shadow: var(--shadow-md);
}

:deep(.el-button--primary:hover) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%);
}
</style>
