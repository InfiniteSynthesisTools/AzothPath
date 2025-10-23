<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <h2>🔐 用户登录</h2>
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
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer">
        还没有账号？ <router-link to="/register">立即注册</router-link>
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

const form = ref({ username: '', password: '' });
const formRef = ref();
const loading = ref(false);

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const handleEnterKey = () => {
  if (form.value.username && form.value.password) {
    handleLogin();
  }
};

const handleLogin = async () => {
  await formRef.value.validate();
  loading.value = true;
  
  try {
    await userStore.login(form.value);
    ElMessage.success('登录成功！');
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.login-card :deep(.el-card__header) {
  text-align: center;
  padding: 20px 20px 10px;
  border-bottom: 1px solid #ebeef5;
}

.login-card :deep(.el-card__body) {
  padding: 20px;
}

h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.footer {
  text-align: center;
  margin-top: 20px;
  color: #606266;
  font-size: 14px;
}

.footer a {
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
}

.footer a:hover {
  text-decoration: underline;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  height: 40px;
}
</style>
