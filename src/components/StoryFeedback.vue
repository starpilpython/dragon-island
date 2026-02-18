<script setup>
/**
 * StoryFeedback.vue
 * 퀘스트 실패(점수 미달) 시 나타나는 피드백 컴포넌트입니다.
 * LoadingDragon.vue와 유사한 스타일로, 드래곤 알과 함께 구체적인 조언을 제공합니다.
 */
const props = defineProps({
  score: {
    type: Number,
    required: true
  },
  feedback: {
    type: String,
    default: ""
  },
  suggestion: {
    type: String,
    default: ""
  }
})

const emit = defineEmits(['retry'])

const handleRetry = () => {
  emit('retry')
}
</script>

<template>
  <div class="feedback-container">
    <div class="feedback-card">
      <div class="dragon-icon-wrapper">
        <img src="../assets/s06_egg.png" alt="Dragon Egg" class="feedback-icon" />
      </div>
      
      <div class="header">
        <h3>아쉬워요! <span class="score">{{ score }}점</span></h3>
        <p class="sub-text">조금만 더 구체적으로 말해볼까요?</p>
      </div>

      <div class="content">
        <div class="feedback-section">
          <p class="feedback-msg">"{{ feedback }}"</p>
        </div>
        
        <div class="suggestion-box" v-if="suggestion">
          <strong>💡 드래곤의 힌트</strong>
          <p>{{ suggestion }}</p>
        </div>
      </div>

      <button class="retry-btn" @click="handleRetry">
        다시 도전하기!
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 전체 오버레이: 배경 흐림 */
.feedback-container {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
  animation: fadeIn 0.3s ease;
}

/* 카드 디자인: 둥글고 깔끔하게 */
.feedback-card {
  background: white;
  width: 90%; max-width: 340px;
  padding: 50px 24px 30px; /* 상단 패딩 늘림 (아이콘 공간) */
  border-radius: 30px;
  text-align: center;
  position: relative;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex; flex-direction: column; gap: 15px;
}

/* 아이콘 래퍼: 상단 중앙에 위치, 테두리 강조 */
.dragon-icon-wrapper {
  position: absolute;
  top: -50px; left: 50%;
  transform: translateX(-50%);
  width: 100px; height: 100px;
  background: white;
  border-radius: 50%;
  border: 4px solid #FFD700; /* 금색 테두리 */
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.feedback-icon { width: 60px; height: auto; animation: shake 2s infinite ease-in-out; }

/* 헤더 텍스트: 점수 강조 */
.header h3 {
  font-size: 1.6rem;
  color: #333;
  margin: 10px 0 5px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.header .score { color: #FF6B6B; font-weight: 800; } /* 붉은색 점수 */

.sub-text { color: #888; font-size: 0.95rem; margin: 0; font-weight: 500; }

/* 본문 피드백 텍스트 */
.feedback-msg {
  font-size: 1.05rem;
  color: #444;
  line-height: 1.6;
  font-weight: 600;
  margin: 0;
  word-break: keep-all;
  padding: 0 10px;
}

/* 힌트 박스: 연한 파란 배경 */
.suggestion-box {
  background: #EFF6FF; /* 아주 연한 파란색 */
  border: 1px solid #BFDBFE;
  padding: 15px;
  text-align: left;
  border-radius: 15px;
  font-size: 0.95rem;
  color: #1E3A8A;
  margin-top: 5px;
}

.suggestion-box strong {
  color: #60A5FA; /* 밝은 파란색 제목 */
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 700;
}

.suggestion-box p { margin: 0; line-height: 1.5; color: #334155; }

/* 다시 도전하기 버튼: 꽉 찬 파란색 */
.retry-btn {
  background: #5B89FF; /* 선명한 파란색 */
  color: white;
  border: none;
  padding: 16px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(91, 137, 255, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  margin-top: 10px;
}
.retry-btn:active { transform: scale(0.96); box-shadow: 0 2px 10px rgba(91, 137, 255, 0.3); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}
</style>
