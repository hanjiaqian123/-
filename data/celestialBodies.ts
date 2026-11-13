export type CelestialBodyId = 'sun' | 'earth' | 'moon';

export type CelestialBody = {
  id: CelestialBodyId;
  name: string;
  englishName: string;
  category: string;
  subtitle: string;
  introduction: string;
  weatherConnection: string;
  facts: readonly { label: string; value: string }[];
  source: string;
};

// Local educational content, with rounded values. No runtime API is used.
export const CELESTIAL_BODIES: readonly CelestialBody[] = [
  {
    id: 'sun',
    name: '太阳',
    englishName: 'SUN',
    category: '恒星',
    subtitle: '一切温暖的起点',
    introduction:
      '太阳是太阳系中心的恒星。它通过核心的核聚变释放能量，为地球带来光与热，也为我们的每一天划分晨昏。',
    weatherConnection:
      '太阳能驱动地球的水循环与大气运动。地表受热不均会影响风和天气；但日常气温还受云量、纬度、季节等因素共同影响。',
    facts: [
      { label: '直径', value: '约 139 万千米' },
      { label: '光球层温度', value: '约 5,500°C' },
      { label: '阳光抵达地球', value: '约 8 分 20 秒' },
    ],
    source: 'NASA Science · Sun Facts（数值取近似值）',
  },
  {
    id: 'earth',
    name: '地球',
    englishName: 'EARTH',
    category: '行星',
    subtitle: '我们唯一的日常',
    introduction:
      '地球是距离太阳第三近的行星。液态海洋、大气和适宜的温度共同构成了熟悉的蓝色家园，也是目前已知唯一存在生命的星球。',
    weatherConnection:
      '我们体验的风雨与冷暖主要发生在大气的对流层。WeatherFit 的天气与穿搭建议，正是为了帮助你适应这颗星球上每天变化的环境。',
    facts: [
      { label: '平均直径', value: '约 12,742 千米' },
      { label: '表面海洋覆盖', value: '约 71%' },
      { label: '自转一周', value: '约 24 小时' },
    ],
    source: 'NASA Science · Earth Facts（数值取近似值）',
  },
  {
    id: 'moon',
    name: '月球',
    englishName: 'MOON',
    category: '天然卫星',
    subtitle: '夜空中熟悉的陪伴',
    introduction:
      '月球是地球的天然卫星。它的自转周期与绕地球公转周期接近，因此我们总能看到大致相同的一面。月相变化来自日、地、月位置关系的改变。',
    weatherConnection:
      '月球没有像地球这样浓厚的大气，地表昼夜温差很大。它的引力是地球潮汐的重要成因；月相本身不能替代当地天气预报。',
    facts: [
      { label: '平均直径', value: '约 3,475 千米' },
      { label: '距地球平均距离', value: '约 38.4 万千米' },
      { label: '绕地球公转', value: '约 27.3 天' },
    ],
    source: 'NASA Science · Moon Facts（数值取近似值）',
  },
];
