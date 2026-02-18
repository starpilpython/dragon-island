<script setup>
const props = defineProps({
  dragon: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="confirm-overlay" @click.self="handleCancel">
    <div class="confirm-modal">
      <!-- 드래곤 미니 이미지 -->
      <div class="dragon-preview">
        <img :src="dragon.image_url" alt="Dragon" class="preview-img" />
      </div>

      <!-- 경고 메시지 -->
      <div class="warning-content">
        <h3 class="warning-title">정말 삭제하시겠어요?</h3>
        <p class="dragon-name-highlight">"{{ dragon.name }}"</p>
        <p class="warning-text">삭제된 드래곤은 복구할 수 없어요.</p>
      </div>

      <!-- 버튼 영역 -->
      <div class="button-group">
        <button class="cancel-btn" @click="handleCancel">
          <span>취소</span>
        </button>
        <button class="confirm-btn" @click="handleConfirm">
          <span>삭제</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000; /* DragonDetailModal보다 위 */
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-modal {
  width: 90%;
  max-width: 340px;
  background: white;
  border-radius: 28px;
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  animation: scale-bounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-bounce {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.dragon-preview {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg, #ffe0b2 0%, #ffccbc 100%);
  border: 3px solid #ff9800;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.warning-content {
  text-align: center;
  margin-bottom: 24px;
}

.warning-title {
  margin: 0 0 12px 0;
  font-size: 1.3rem;
  font-weight: 900;
  color: #d32f2f;
}

.dragon-name-highlight {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #4a148c;
  background: linear-gradient(135deg, #e1bee7 0%, #f3e5f5 100%);
  padding: 8px 16px;
  border-radius: 12px;
  display: inline-block;
}

.warning-text {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
}

.button-group {
  width: 100%;
  display: flex;
  gap: 12px;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cancel-btn {
  background: #e0e0e0;
  color: #666;
}

.cancel-btn:hover {
  background: #d0d0d0;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.confirm-btn {
  background: linear-gradient(135deg, #ff5252 0%, #ff1744 100%);
  color: white;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #ff1744 0%, #d50000 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 23, 68, 0.4);
}

.cancel-btn:active,
.confirm-btn:active {
  transform: translateY(0);
}
</style>
