<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import DragonDetailModal from './DragonDetailModal.vue'
import DeleteConfirmModal from './DeleteConfirmModal.vue'

const props = defineProps({
  idToken: String
})

const emit = defineEmits(['modal-state-change', 'read-story'])

const activeFilter = ref('최신')
const dragons = ref([])
const isLoading = ref(false)
const additionalSlots = ref(0) // [NEW] 추가된 빈 슬롯 개수

// [NEW] 상세 정보 모달 관련 상태
const selectedDragon = ref(null)
const isDetailOpen = ref(false)

// [NEW] 삭제 확인 모달 관련 상태
const isDeleteConfirmOpen = ref(false)
const dragonToDelete = ref(null)

// [NEW] 결과 알림 모달 상태
const isResultModalOpen = ref(false)
const resultModalMessage = ref('')
const resultModalType = ref('info')

const openResultModal = (message, type = 'info') => {
  resultModalMessage.value = message
  resultModalType.value = type
  isResultModalOpen.value = true
}

const closeResultModal = () => {
  isResultModalOpen.value = false
  // [NEW] 삭제 성공 시에만 모달을 닫을 때 데이터 갱신
  if (resultModalType.value === 'success') {
    fetchDragons()
    emit('refresh-profile')
  }
}

// 드래곤 목록 가져오기
const fetchDragons = async () => {
  if (!props.idToken) {
    console.warn('도감: idToken이 아직 없습니다. 대기 중...')
    return
  }
  
  if (isLoading.value) return // 이미 로딩 중이면 중복 요청 방지
  
  isLoading.value = true
  try {
    console.log('도감: 데이터를 불러오는 중... token:', props.idToken.substring(0, 20) + '...')
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dragons`, {
      headers: {
        'Authorization': `Bearer ${props.idToken}`
      }
    })
    
    if (Array.isArray(response.data)) {
      dragons.value = response.data
      console.log('도감 데이터 로드 완료:', dragons.value.length, '마리')
    } else {
      console.error('도감 데이터 형식 오류 (배열이 아님):', response.data)
      dragons.value = []
    }
  } catch (error) {
    console.error('도감 로드 실패 (API 에러):', error.response?.data || error.message)
    dragons.value = []
  } finally {
    isLoading.value = false
  }
}

// 필터링된 드래곤 목록
const filteredDragons = computed(() => {
  let list = [...dragons.value]
  if (activeFilter.value === '최신') {
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (activeFilter.value === '이름') {
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }
  return list
})

// 드래곤 목록 및 빈 슬롯을 포함한 최종 표시 목록 (항상 6개 이상 유지)
const displayDragons = computed(() => {
  // 실제 필터링된 데이터
  const baseList = [...filteredDragons.value]
  
  // 기본 6개 + 사용자가 추가한 개수만큼 빈 슬롯 확보
  const targetCount = Math.max(6, baseList.length + additionalSlots.value)
  const emptyCount = Math.max(0, targetCount - baseList.length)
  
  const emptySlots = Array.from({ length: emptyCount }, (_, i) => ({
    id: `empty-${Date.now()}-${i}`,
    isPlaceholder: true
  }))
  
  return [...baseList, ...emptySlots]
})

// [NEW] 빈 셀 추가 함수
const addEmptySlot = () => {
  additionalSlots.value++
}

// [NEW] 드래곤 상세 정보 열기
const openDetail = (dragon) => {
  if (dragon.isPlaceholder) return
  selectedDragon.value = dragon
  isDetailOpen.value = true
}

const handleReadStoryInView = (dragon) => {
  emit('read-story', dragon)
  isDetailOpen.value = false
}

// [NEW] 드래곤 삭제 확인 모달 열기
const handleDeleteDragon = (dragon) => {
  dragonToDelete.value = dragon
  isDeleteConfirmOpen.value = true
}

// [NEW] 삭제 확인 후 실제 삭제 처리
const deleteDragon = async (dragonId) => {
  isLoading.value = true;
  // setIsLoading(true, '드래곤을 자연으로 보내주는 중...') // Removed undefined function call
  try {
    const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/dragons/${dragonId}`, {
      headers: {
        'Authorization': `Bearer ${props.idToken}`
      }
    })
    
    // [NEW] 삭제 후 보유 머니 정보 갱신 (환불 금액 반영 위해)
    // const profileRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/profile?uid=${props.uid}`)
    
    const refund = response.data.refund_amount || 0
    if (refund > 0) {
      openResultModal(`드래곤이 감사의 선물로 ${refund} 머니를 남기고 떠났습니다! 💰`, 'success')
    } else {
      openResultModal('드래곤을 무사히 떠나보냈습니다.', 'success')
    }

    isDeleteConfirmOpen.value = false
    isDetailOpen.value = false
    dragonToDelete.value = null
    
    // [MODIFIED] fetchDragons()는 이제 closeResultModal에서 수행함
  } catch (error) {
    console.error('드래곤 삭제 실패:', error)
    openResultModal('삭제 중에 오류가 발생했습니다.', 'error')
  } finally {
    isLoading.value = false // 로딩 상태 해제
  }
}

// [NEW] 삭제 취소
const cancelDelete = () => {
  isDeleteConfirmOpen.value = false
  dragonToDelete.value = null
}

// [NEW] 모달 상태 변화를 부모에게 알림
watch(isDetailOpen, (isOpen) => {
  emit('modal-state-change', isOpen)
})

// [NEW] 삭제 확인 모달에서 '확인' 클릭 시 호출
const confirmDelete = () => {
  if (dragonToDelete.value) {
    deleteDragon(dragonToDelete.value.id)
  }
}

// [Core] idToken이 늦게 들어올 경우를 대비해 감시 로직 추가
watch(() => props.idToken, (newToken) => {
  if (newToken) {
    console.log('도감: idToken 수신됨, 데이터를 다시 불러옵니다.')
    fetchDragons()
  }
}, { immediate: true })

onMounted(() => {
  if (props.idToken) fetchDragons()
})
</script>

<template>
  <div class="collection-view">
    <!-- 헤더 영역 (로고) -->
    <div class="header-logo-container">
      <img src="../assets/s11_logo.png" class="header-logo" alt="Collection Logo" />
    </div>

    <!-- 필터 영역 -->
    <div class="filter-area">
      <div class="filter-chips">
        <button 
          class="chip" 
          :class="{ active: activeFilter === '최신' }"
          @click="activeFilter = '최신'"
        >날짜순</button>
        <button 
          class="chip" 
          :class="{ active: activeFilter === '이름' }"
          @click="activeFilter = '이름'"
        >이름순</button>
      </div>
    </div>

    <!-- 로딩 표시기 (데이터가 하나도 없을 때만 표시) -->
    <div v-if="isLoading && dragons.length === 0" class="loading-status">드래곤들을 불러오는 중...</div>

    <!-- 도감 그리드 (단일 루프로 통합하여 겹침 방지) -->
    <div class="dragon-grid">
      <div 
        v-for="item in displayDragons" 
        :key="item.id" 
        class="dragon-slot" 
        :class="{ filled: !item.isPlaceholder, clickable: !item.isPlaceholder }"
        @click="openDetail(item)"
      >
        <!-- 1. 실제 데이터가 있는 경우 -->
        <template v-if="!item.isPlaceholder">
          <div class="dragon-img-box">
            <img :src="item.image_url" class="dragon-thumb" :alt="item.name" />
          </div>
          <div class="dragon-info">
            <span class="dragon-name">{{ item.name }}</span>
            <span class="dragon-exp">EXP: {{ item.exp || 0 }}</span>
          </div>
        </template>
        
        <!-- 2. 빈 슬롯인 경우 -->
        <template v-else>
          <div class="empty-icon">?</div>
        </template>
      </div>
    </div>

    <!-- [NEW] 상세 정보 모달 -->
    <DragonDetailModal
      v-if="isDetailOpen"
      :dragon="selectedDragon"
      @close="isDetailOpen = false"
      @read-story="handleReadStoryInView"
      @delete="handleDeleteDragon"
    />

    <!-- [NEW] 삭제 확인 모달 -->
    <DeleteConfirmModal
      v-if="isDeleteConfirmOpen && dragonToDelete"
      :dragon="dragonToDelete"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <!-- [NEW] 결과 알림 모달 -->
    <div v-if="isResultModalOpen" class="modal-overlay" @click.self="closeResultModal">
      <div class="modal-content">
        <h3 class="modal-title">
          {{ resultModalType === 'error' ? '오류' : (resultModalType === 'success' ? '성공' : '알림') }}
        </h3>
        <p class="modal-message" :class="resultModalType">{{ resultModalMessage }}</p>
        <button class="modal-close-btn" @click="closeResultModal">확인</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-view {
  position: relative;
  z-index: 5;
  width: 100%;
  height: calc(100% - 90px); /* 하단 바 제외 높이 */
  padding: 60px 20px 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.header-logo-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.header-logo {
  width: 100%;
  max-width: 500px;
  height: auto;
  object-fit: contain;
}

.filter-area {
  display: flex;
  justify-content: space-between; /* 다시 양쪽 끝 정렬 */
  align-items: center;
  margin-bottom: 20px;
}

.add-cell-btn {
  background-color: white;
  border: 2px solid #a5c3f6;
  border-radius: 20px;
  padding: 6px 15px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #a5c3f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(165, 195, 246, 0.2);
}

.add-cell-btn:hover {
  background-color: #a5c3f6;
  color: white;
  transform: translateY(-2px);
}

.plus-icon {
  font-size: 1.1rem;
}

.loading-status {
  text-align: center;
  font-size: 0.85rem;
  color: #777;
  margin-bottom: 15px;
  padding: 5px;
}

.chip {
  padding: 8px 25px;
  border-radius: 20px;
  border: 2px solid #ddd;
  background-color: white;
  font-weight: bold;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.chip.active {
  background-color: #a5c3f6;
  border-color: #a5c3f6;
  color: white;
}

.dragon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: min-content; /* 내용에 맞춰 행 높이 조절 */
  gap: 15px;
  overflow-y: auto;
  flex: 1;
  padding: 5px; /* 테두리 잘림 방지 */
}

.dragon-slot {
  position: relative;
  aspect-ratio: 1/1.3;
  background-color: rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  border: 2px dashed #ccc;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: all 0.2s;
  box-sizing: border-box;
}

.dragon-slot.clickable {
  cursor: pointer;
}

.dragon-slot.clickable:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: #a5c3f6;
}

.dragon-slot.filled {
  background-color: white;
  border: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dragon-slot.filled:hover {
  transform: translateY(-5px);
}

.dragon-img-box {
  width: 100%;
  flex: 1;
  background-color: #f5f5f5;
  overflow: hidden;

  /* 아래 코드를 추가해 보세요 */
  padding: 15px; /* 숫자가 커질수록 이미지가 더 작아집니다 */
  box-sizing: border-box;
}

.dragon-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s;
}

.dragon-slot.filled:hover .dragon-thumb {
  transform: scale(1.1);
}

.dragon-info {
  width: 100%;
  padding: 10px 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: white;
  box-sizing: border-box;
}

.dragon-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: #444;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 10px;
}

.empty-icon {
  font-family: 'Jua', sans-serif;
  color: #555;
}

.dragon-exp {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
  font-weight: bold;
}
</style>

<style scoped>
/* 모달 스타일 (Shop.vue와 동일) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 20px;
  width: 90%;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: scaleUp 0.3s ease;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #3e2723;
  margin-bottom: 10px;
}

.modal-message {
  font-size: 1rem;
  color: #5d4037;
  margin-bottom: 20px;
  line-height: 1.5;
  word-break: keep-all;
}

.modal-message.error {
  color: #d32f2f;
}

.modal-message.success {
  color: #388e3c;
}

.modal-close-btn {
  background: #ffca28;
  color: #5d4037;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 3px 0 #ffa000;
  transition: transform 0.1s;
}

.modal-close-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #ffa000;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
