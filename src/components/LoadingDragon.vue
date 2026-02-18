<script setup>
/**
 * LoadingDragon.vue
 * 드래곤 생성 시 또는 앱 로딩 시 보여줄 로딩 화면 컴포넌트입니다.
 * 점수가 낮을 경우 알 위에 말풍선으로 조언과 점수를 표시합니다.
 */
const props = defineProps({
  feedback: {
    type: String,
    default: ""
  },
  score: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['retry'])

const handleRetry = () => {
  emit('retry')
}
</script>

<template>
  <div class="loading-container">
    <!-- 배경 이미지 및 음영 설정 -->
    <div class="background-container">
      <img src="../assets/s06.png" class="background-img" alt="Loading Background" />
      <div class="background-overlay"></div>
    </div>

    <!-- 로딩 중 콘텐츠 -->
    <div class="loader-content">
      <!-- 피드백이 있을 때 알 위에 나타나는 말풍선 -->
      <div v-if="feedback" class="speech-bubble">
        <div class="bubble-header">
          <span class="score-badge">묘사 점수: {{ score }}점</span>
          <span class="bubble-title">💡 드래곤의 조언</span>
        </div>
        <p class="bubble-content">{{ feedback }}</p>
        <div class="bubble-tail"></div>
      </div>

      <img src="../assets/s06_egg.png" class="egg-img" :class="{ 'error-egg': feedback }" alt="Dragon Egg" />
      
      <div class="text-group">
        <!-- 피드백이 없을 때는 일반 로딩 메시지 -->
        <template v-if="!feedback">
          <p class="loading-text">드래곤이 태어나는 중...</p>
          <div class="loading-bar-container">
            <div class="loading-bar-infinite">
              <div class="bar-shine"></div>
            </div>
          </div>
        </template>
        
        <!-- 피드백이 있을 때는 하단에 말하고 만들기 버튼 노출 -->
        <template v-else>
          <button class="retry-btn-styled" @click="handleRetry">
            <span class="mic-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </span>
            다시 도전하기
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 로딩 화면 전체 컨테이너 */
.loading-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 배경 이미지 컨테이너 */
.background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.background-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.05);
  z-index: 1;
}

/* 중앙 콘텐츠 레이어 */
.loader-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 90%;
  max-width: 600px;
}

/* [NEW] 말풍선 스타일 */
.speech-bubble {
  position: relative;
  background: rgba(197, 230, 198, 0.9); /* 연한 초록색 반투명 배경 */
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  width: 90%;
  animation: bubble-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 4px solid #ffffff;
}

@keyframes bubble-pop {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  padding-bottom: 8px;
}

.score-badge {
  background: #3f51b5;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: bold;
}

.bubble-title {
  font-weight: bold;
  color: #2e7d32;
  font-size: 1.1rem;
}

.bubble-content {
  color: #1b5e20;
  font-size: 1.05rem;
  line-height: 1.5;
  margin: 0;
  font-weight: 500;
  word-break: keep-all;
}

.bubble-tail {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-top: 20px solid #ffffff;
}

.bubble-tail::after {
  content: '';
  position: absolute;
  top: -24px;
  left: -15px;
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-top: 20px solid rgba(197, 230, 198, 0.9);
}

.text-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* 알 이미지 스타일 및 애니메이션 */
.egg-img {
  width: 35vw;
  max-width: 400px;
  min-width: 250px;
  height: auto;
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.6));
  animation: 
    egg-shake 1.5s infinite ease-in-out,
    egg-glow 2s infinite alternate ease-in-out;
}

/* 에러(피드백) 발생 시 알 효과 강화 */
.error-egg {
  animation: 
    egg-intense-shake 0.5s infinite ease-in-out,
    egg-glow 1s infinite alternate ease-in-out;
}

@keyframes egg-intense-shake {
  0% { transform: translate(0, 0) rotate(0); }
  25% { transform: translate(-5px, 0) rotate(-4deg); }
  50% { transform: translate(5px, 0) rotate(4deg); }
  75% { transform: translate(-3px, 0) rotate(-2deg); }
  100% { transform: translate(3px, 0) rotate(2deg); }
}

/* [NEW] 이미지 스타일 반영: 연한 파란색(라벤더) 라운드 버튼 */
.retry-btn-styled {
  background: #a5bdf6; /* 이미지와 유사한 파스텔 블루 */
  color: white; /* 텍스트 흰색 */
  border: none;
  padding: 14px 40px;
  border-radius: 50px; /* 완전 라운드 */
  font-size: 1.45rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(165, 189, 246, 0.4);
  transition: all 0.3s ease;
  margin-top: 10px;
  width: 85vw;
  max-width: 400px;
  border: 4px solid #ffffff; /* 흰색 테두리 반영 */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.mic-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.retry-btn-styled:hover {
  transform: translateY(-3px) scale(1.02);
  filter: brightness(1.05);
}

.retry-btn-styled:active {
  transform: translateY(1px);
}

/* 로딩바 부모 컨테이너 */
.loading-bar-container {
  width: 60vw;
  max-width: 400px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  border: 3px solid #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  margin-top: 15px;
}

.loading-bar-infinite {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    -45deg, 
    #a5c3f6 25%, 
    #81d4fa 25%, 
    #81d4fa 50%, 
    #a5c3f6 50%, 
    #a5c3f6 75%, 
    #81d4fa 75%, 
    #81d4fa
  );
  background-size: 40px 40px;
  animation: move-bar 1s linear infinite;
  border-radius: 20px;
}

.bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 20px 20px 0 0;
}

@keyframes move-bar {
  from { background-position: 0 0; }
  to { background-position: 40px 0; }
}

.loading-text {
  color: #3f427b; 
  font-size: clamp(1.4rem, 4vw, 2.5rem); 
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5); 
  letter-spacing: 1px;
}

@keyframes egg-shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(8deg); }
  60% { transform: rotate(-5deg); }
  80% { transform: rotate(5deg); }
}

@keyframes egg-glow {
  from {
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.4));
  }
  to {
    filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 50px rgba(255, 255, 200, 0.5));
  }
}
</style>