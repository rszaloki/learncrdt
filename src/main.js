import App from 'src/App.html'
import store from 'src/store'

const app = new App({
  target: document.body,
  store
})

export default app