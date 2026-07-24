export const tools = [
  {
    type: 'function',
    function: {
      name: 'checkAvailability',
      description: '특정 자원(resource)의 특정 시간대 예약 가능 여부를 확인',
      parameters: {
        type: 'object',
        properties: {
          resource_name: {
            type: 'string',
            description: '자원 이름',
          },
          date: {
            type: 'string',
            description: '날짜 (YYYY-MM-DD)',
          },
          start_time: {
            type: 'string',
            description: '시작 시간 (HH:MM)',
          },
          end_time: {
            type: 'string',
            description: '종료 시간 (HH:MM)',
          },
        },
        required: ['resource_name', 'date', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createReservation',
      description: '실제로 예약을 생성',
      parameters: {
        type: 'object',
        properties: {
          resource_name: {
            type: 'string',
            description: '자원 이름',
          },
          date: {
            type: 'string',
            description: '날짜 (YYYY-MM-DD)',
          },
          start_time: {
            type: 'string',
            description: '시작 시간 (HH:MM)',
          },
          end_time: {
            type: 'string',
            description: '종료 시간 (HH:MM)',
          },
        },
        required: ['resource_name', 'date', 'start_time', 'end_time'],
      },
    },
  },
];
