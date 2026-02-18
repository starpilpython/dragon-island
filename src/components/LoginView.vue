<script setup>
import { auth, googleProvider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'
import axios from 'axios'

// 구글 로그인 함수
const loginGoogle = async () => {
  try {
    // 1. 구글 팝업 로그인 실행
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    // 2. Firebase ID 토큰 가져오기
    const idToken = await user.getIdToken()
    localStorage.setItem('idToken', idToken) // [FIX] 토큰 저장
    
    // 3. 백엔드(FastAPI)로 토큰 전송하여 로그인 확인
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      idToken: idToken
    })
    
    console.log('서버 로그인 응답:', response.data)    
  } catch (error) {
    console.error('로그인 중 에러 발생:', error)
  }
}
</script>

<template>
  <div class="main-container">
    <div class="background-container">
      <img src="../assets/s01.png" class="background-img" alt="Background" />
    </div>    

    <div class="content">
      <img src="../assets/s01_logo.png" class="logo-img" alt="Background" />

      <div class="login-box">
        <button class="google-login-btn" @click="loginGoogle">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" class="google-logo" />
          <span>Google 계정으로 로그인</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 화면 전체를 감싸는 컨테이너 */
.main-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 배경을 화면 전체에 고정 */
.background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0; /* 가장 뒤로 보내기 */
}

.background-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 콘텐츠 영역 */
.content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 수직 중앙 정렬로 먼저 맞춤 */
  justify-content: center; 
  align-items: center;
}


/* 로고 이미지 스타일 */
.logo-img {
  width: 270px; /* 로고 크기 조정 */
  height: auto;
  /* 흔들리는 애니메이션 적용 */
  animation: shake 4s infinite ease-in-out;
}

/* 좌우로 흔들거리는 애니메이션 정의 */
@keyframes shake {
  0%, 100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}

/* 로그인 박스 (버튼 감싸는 영역) */
.login-box {
  /* 중앙에서 살짝 아래로 밀기 위해 margin-top 사용 */
  /* 10vh는 화면 높이의 10%만큼 더 내려간다는 의미입니다. */
  margin-top: 10vh; 
}

/* 구글 로그인 버튼 스타일 */
.google-login-btn {
  display: flex;
  align-items: center;
  background-color: white;
  color: #757575;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.25);
  transition: background-color 0.2s, box-shadow 0.2s;
}

.google-login-btn:hover {
  background-color: #eeeeee;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.google-logo {
  width: 18px;
  height: 18px;
  margin-right: 12px;
}

</style>