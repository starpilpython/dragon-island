<script setup>
/**
 * ResultSuccess.vue
 * 드래곤 생성이 성공적으로 완료되었을 때 보여주는 화면입니다.
 * 사용자 제공 이미지 테마를 반영하여 리본, 카드 프레임, 전설 배지, 설명창을 구현했습니다.
 */
const props = defineProps({
  energy: Number,
  timerText: String,
  dragonName: {
    type: String,
    default: "신비한 드래곤"
  },
  dragonImage: {
    type: String,
    default: ""
  },
  dragonDescription: {
    type: String,
    default: "신비로운 힘을 가진 드래곤이 당신을 찾아왔어요! 어떤 모험이 기다리고 있을까요?"
  }
})

const emit = defineEmits(['go-home', 'read-story'])
const maxEnergy = 5

const handleGoHome = () => {
  emit('go-home')
}

const handleReadStory = () => {
  emit('read-story')
}
</script>

<template>
  <div class="result-container" @click="handleGoHome">
    <!-- 0. 상단 로고 및 에너지 바 레이어 -->
    <div class="top-nav-layer">
      <!-- 좌측 상단 로고 -->
      <div class="top-logo-box">
        <img src="../assets/s07_logo.png" class="top-brand-logo" alt="Logo" />
      </div>

      <!-- 우측 상단 에너지 바 -->
      <div class="top-energy-status">
        <div class="energy-status-bar">
          <div class="energy-content-row">
            <div class="energy-icon-wrapper">
              <span class="energy-icon">⚡</span>
              <span class="energy-count">{{ energy }} / 5</span>
            </div>
            <div v-if="timerText" class="timer-display-inline">
              <span class="timer-divider">|</span>
              {{ timerText }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 중앙 드래곤 정보 (이미지 카드 + 설명창) -->
    <div class="dragon-display-group">
      
      <!-- 1. 중앙 이미지 카드 프레임 (상단으로 이동) -->
      <div class="image-frame-card">
        <!-- 드래곤 이미지 영역 -->
        <div class="dragon-image-screen">
          <img v-if="dragonImage" :src="dragonImage" class="dragon-main-img" alt="Dragon" />
          <div v-else class="image-placeholder">🐲</div>

          <!-- 도감 저장 알림 필 (이미지 내부 배치) -->
          <div class="status-pill">
            <span class="check-icon">✓</span>
            <span class="pill-text">도감에 저장됐어!</span>
          </div>
        </div>
      </div>

      <!-- 2. 하단 설명 말풍선 (이름 포함) -->
      <div class="description-bubble">
        <h2 class="dragon-name-display">{{ dragonName }}</h2>
        <p class="desc-text">{{ dragonDescription }}</p>
        <!-- 말풍선 꼬리 -->
        <div class="desc-tail"></div>
      </div>

      <!-- 3. 하단 버튼 영역 -->
      <div class="action-buttons-group" @click.stop>
        <!-- 동화 읽기 버튼 (이미지 테마 반영) -->
        <button class="story-read-btn" @click="handleReadStory">
          <div class="btn-icon-box">
             <img src="../assets/s07_icon1.png" class="btn-asset-icon" alt="Story Icon" />
          </div>
          <span class="btn-text">동화 읽기</span>
        </button>

        <!-- 홈으로 가기 버튼 (주황색 테크) -->
        <button class="go-home-btn" @click="handleGoHome">
          <div class="btn-icon-box">
             <img src="../assets/s07_icon2.png" class="btn-asset-icon" alt="Home Icon" />
          </div>
          <span class="btn-text">홈으로 가기</span>
        </button>
      </div>
    </div>

    <!-- 배경 레이어 -->
    <div class="background-container">
      <img src="../assets/s07.png" class="background-img" alt="Success Background" />
    </div>
  </div>
</template>

<style scoped>
.result-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #e1f5fe; /* s07 로드 전 기본 색상 */
}

.background-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

.background-img {
  width: 100%; height: 100%;
  object-fit: cover;
}

/* 상단 내비게이션 레이어 (로고 + 에너지바) */
.top-nav-layer {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%; /* 가로 폭 제한 */
  max-width: 440px; /* 드래곤 카드 폭과 비슷하게 맞춰서 일체감 부여 */
  display: flex;
  justify-content: space-between; /* 양 끝으로 벌리되 max-width 안에서 벌어짐 */
  align-items: center;
  z-index: 100;
  pointer-events: none;
}

.top-logo-box, .top-energy-status {
  pointer-events: auto; /* 버튼이나 바 내부는 클릭 가능 */
}

.top-brand-logo {
  height: 45px; /* 에너지바 높이와 시각적 밸런스 조정 */
  width: auto;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

/* 에너지 바 (가변 가로 레이아웃) */
.energy-status-bar {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 6px 15px; /* 세로 패딩 조절 */
  border-radius: 20px;
  box-shadow: 2px 4px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  border: 2px solid #ffcc00;
  cursor: default;
  /* 우측 고정, 좌측으로 늘어남 */
  white-space: nowrap;
}

.energy-content-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.energy-icon-wrapper { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
}

.energy-icon { font-size: 1.1rem; color: #ffcc00; }
.energy-count { font-weight: bold; font-size: 1rem; color: #333; }

.timer-display-inline { 
  font-size: 0.85rem; 
  color: #666; 
  display: flex; 
  align-items: center; 
  gap: 8px;
}

.timer-divider {
  color: #ddd;
  font-weight: normal;
}

/* 메인 디스플레이 그룹 */
.dragon-display-group {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80%;
  max-width: 420px;
  margin-top: 80px; /* 전체적으로 살짝 아래로 이동 */
  animation: slide-up 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 1. 이미지 프레임 카드 (상단으로 이동하며 비중 강화) */
.image-frame-card {
  position: relative;
  width: 90%;
  background: #ffffff;
  border: 12px solid #ffffff; 
  border-radius: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: visible; 
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 0px;
  margin-bottom: 5px; /* 하단 설명창과의 간격 */
}

.dragon-image-screen {
  width: 100%;
  aspect-ratio: 1/1;
  background: linear-gradient(135deg, #e1f5fe 0%, #f3e5f5 100%);
  border-radius: 28px;
  overflow: hidden;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.dragon-main-img {
  width: 100%; height: 100%;
  object-fit: cover;
  /* 이미지 역동감 부여: 좌우 흔들림 + 반짝임 효과 */
  animation: 
    soft-sway 4s infinite ease-in-out,
    glow-sparkle 3s infinite alternate ease-in-out;
}

@keyframes soft-sway {
  0%, 100% { transform: translateX(0) scale(1); }
  50% { transform: translateX(10px) scale(1.02); } /* 살짝 우측으로 이동하며 확대 */
}

@keyframes glow-sparkle {
  from { filter: brightness(1) drop-shadow(0 0 5px rgba(255, 255, 255, 0)); }
  to { filter: brightness(1.15) drop-shadow(0 0 15px rgba(255, 255, 255, 0.6)); }
}

/* 도감 저장 상태 필 (절대 위치로 변경하여 하단 여백 영향 제거) */
.status-pill {
  position: absolute;
  bottom: 10px; /* 이미지 하단에 배치 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  background: #ffffff;
  padding: 6px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border: 2px solid #e1f5fe;
  width: max-content;
}

.check-icon {
  background: #81c784;
  color: white;
  width: 20px; height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

.pill-text {
  font-weight: bold;
  color: #555;
  font-size: 1rem;
}

/* 3. 하단 설명 말풍선 (이미지 테마 정밀 반영) */
.description-bubble {
  margin-top: 25px;
  background: #fff9f0; /* 포근한 크림색 배경 */
  border: 2px dashed #e0d0b0; /* 연한 베이지색 점선 테두리 */
  border-radius: 20px;
  padding: 15px 25px;
  position: relative;
  width: 92%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.desc-text {
  margin: 0;
  color: #5d4037; /* 진한 브라운 텍스트 */
  font-size: 1.1rem;
  line-height: 1.6;
  font-weight: 500;
  text-align: center; /* 텍스트 중앙 정렬 */
  word-break: keep-all;
}

.dragon-name-display {
  margin: 0 0 8px 0;
  color: #4a148c; /* 진한 보라색으로 이름 강조 */
  font-size: 1.3rem; /* 크기 축소 */
  font-weight: 900;
  text-align: center;
  white-space: nowrap; /* 한 줄 유지 */
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc-tail {
  position: absolute;
  top: -12px; 
  left: 40px;
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid #fff9f0; /* 배경색과 일치 */
}

/* 4. 버튼 영역 스타일 */
.action-buttons-group {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  width: 100%;
}

.story-read-btn {
  background: #80cbc4;
  border: 4px solid #ffffff;
  border-radius: 50px;
  padding: 10px 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.story-read-btn, .go-home-btn {
  border: 4px solid #ffffff;
  border-radius: 50px;
  padding: 8px 25px; /* 좌우 패딩 균형 조정 */
  display: flex;
  align-items: center;
  justify-content: center; /* 내용물 전체를 중앙으로 */
  gap: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 240px; /* 버튼 크기 안정화 */
}

.story-read-btn {
  background: #80cbc4;
}

.go-home-btn {
  background: #ffab91; /* 부드러운 주황색 */
}

.story-read-btn:hover, .go-home-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.btn-icon-box {
  width: 50px; /* 크기 소폭 확대 */
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-asset-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.btn-emoji {
  font-size: 1.4rem;
}

.btn-text {
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: 900;
  text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
}

.click-to-lobby {
  display: none; 
}

.image-placeholder { font-size: 5rem; }
</style>
