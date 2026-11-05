jest.mock('expo-secure-store', () => {
  const { secureMemory: store } = require('./src/test/inMemoryKv');

  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    isAvailableAsync: jest.fn(async () => true),
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const { asyncMemory: store } = require('./src/test/inMemoryKv');

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key) => store.get(key) ?? null),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key) => {
        store.delete(key);
      }),
    },
  };
});
