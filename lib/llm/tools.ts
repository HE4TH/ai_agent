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
          attendee_count: {
            type: 'integer',
            description: '예약 이용 인원 수',
          },
        },
        required: ['resource_name', 'date', 'start_time', 'end_time', 'attendee_count'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getResourceInfo',
      description: '특정 자원(회의실 등)의 상세 정보(수용 인원, 위치, 종류)를 조회',
      parameters: {
        type: 'object',
        properties: {
          resource_name: {
            type: 'string',
            description: '자원 이름',
          },
        },
        required: ['resource_name'],
      },
    },
  },
];
