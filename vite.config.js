export default {
  preview: {
    allowedHosts: [
      'mczpgf.hospedagemelastica.com.br',
      'todaarte.com.br'
    ]
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
} 