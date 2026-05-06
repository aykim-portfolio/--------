// data.js
// 기상청 데이터 및 한전/가스공사 통계를 기반으로 모형화한 고급 데이터셋

const regionData = {
    "Seoul": {
        name: "서울",
        temp: 12.5, wind: 2.3, humidity: 61, sunshine: 2066, fogDays: 15,
        // 월별 난방도일(HDD) - 1월~12월
        monthlyHdd: [650, 520, 310, 120, 20, 0, 0, 0, 10, 100, 350, 580],
        // 월별 냉방도일(CDD) - 1월~12월
        monthlyCdd: [0, 0, 0, 0, 5, 40, 180, 220, 60, 0, 0, 0],
        description: "사계절이 뚜렷하며, 겨울철 건조하고 추운 전형적인 중부지방 날씨입니다."
    },
    "Busan": { 
        name: "부산", 
        temp: 14.7, 
        humidity: 64.0, 
        wind: 3.6, 
        sunshine: 2327,
        description: "바닷바람이 불고 겨울이 상대적으로 따뜻합니다.",
        monthlyHdd: [380, 290, 180, 50, 0, 0, 0, 0, 0, 40, 180, 340],
        monthlyCdd: [0, 0, 0, 0, 20, 100, 250, 290, 120, 15, 0, 0]
    },
    "Jeju": { 
        name: "제주", 
        temp: 16.2, 
        humidity: 71.0, 
        wind: 4.8, 
        sunshine: 1983,
        description: "사계절 온화하지만 바람과 습도가 매우 높습니다.",
        monthlyHdd: [320, 280, 150, 50, 0, 0, 0, 0, 0, 20, 120, 260],
        monthlyCdd: [0, 0, 0, 5, 20, 80, 280, 320, 120, 10, 0, 0]
    },
    "Gangneung": {
        name: "강릉",
        temp: 13.5, wind: 2.5, humidity: 60, sunshine: 2200, fogDays: 5,
        monthlyHdd: [500, 420, 260, 100, 10, 0, 0, 0, 0, 70, 240, 450],
        monthlyCdd: [0, 0, 0, 0, 5, 30, 150, 190, 40, 0, 0, 0],
        description: "태백산맥의 영향으로 겨울에 덜 춥지만, 눈이 많이 오고 봄철 건조한 바람(양간지풍)이 붑니다."
    },
    "Chuncheon": {
        name: "춘천",
        temp: 11.1, wind: 1.5, humidity: 69, sunshine: 2000, fogDays: 45,
        monthlyHdd: [710, 540, 350, 150, 30, 0, 0, 0, 20, 140, 410, 650],
        monthlyCdd: [0, 0, 0, 0, 10, 70, 210, 250, 80, 0, 0, 0],
        description: "분지 지형으로 일교차와 연교차가 매우 큽니다. 안개가 잦고 겨울이 많이 춥습니다."
    },
    "Gwangju": { 
        name: "광주", 
        temp: 14.2, 
        humidity: 65.0, 
        wind: 2.2, 
        sunshine: 2250,
        description: "여름철 무더위와 겨울철 눈이 특징입니다.",
        monthlyHdd: [520, 420, 240, 90, 10, 0, 0, 0, 0, 60, 250, 460],
        monthlyCdd: [0, 0, 0, 0, 15, 60, 230, 270, 90, 10, 0, 0]
    }
};

// 주택 구조별 열손실 계수 (기준: 아파트 = 1.0)
const houseTypeFactors = {
    "apartment": { name: "아파트", factor: 1.0 },
    "villa": { name: "빌라/다세대", factor: 1.3 },
    "detached": { name: "단독주택", factor: 1.6 }
};

// 건축 연식(단열 등급)
const insulationGrades = {
    "high": { name: "신축 (단열 우수)", factor: 0.8 },
    "mid": { name: "기본 (단열 보통)", factor: 1.0 },
    "low": { name: "구축 (단열 취약)", factor: 1.4 }
};

// 난방 방식
const heatingMethods = {
    "cityGas": { name: "개별난방(도시가스)", costPerHddUnit: 15 },
    "district": { name: "지역난방", costPerHddUnit: 12 },
    "electric": { name: "전기보일러", costPerHddUnit: 25 } // 누진세 미반영 단순 단가
};

// 냉방 단가
const coolingMethod = {
    method: "에어컨 (전기)",
    costPerCddUnit: 40 // 기본 전기요금 추정 단가
};

// ESG 환산 계수
const esgFactors = {
    co2PerKwh: 0.466, // kg CO2 / kWh
    pineTreeAbsorption: 6.6, // kg CO2 / year / tree
    insulationCost: 5000000 // 샷시 교체 투자비용 기본값
};
