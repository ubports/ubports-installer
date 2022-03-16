const axios = {
  get: jest.fn().mockResolvedValue(),
  post: jest.fn().mockResolvedValue(),
  create: jest.fn()
};

axios.create.mockReturnValue(axios);

module.exports = axios;
