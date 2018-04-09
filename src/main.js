import App from 'src/App.html'
import Mergable from 'src/crdt'

const app = new App({
  target: document.body,
  data: {
    name: 'world'
  }
})

window.app = app

window.Mergable = Mergable


export default app