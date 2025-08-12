import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
   server: {

    allowedHosts: ['chatblink.in'] 
    // allowedHosts: ['www.chatherr.com']// Add this line

    

  },
  plugins: [react()],
})
