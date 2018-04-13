import store from 'src/store'
import load from 'load-script'

const gclient = (new Promise(resolve => load('https://apis.google.com/js/platform.js', null, resolve))).then(
  () => new Promise(resolve => window.gapi.load('client:auth2', resolve))).then(() => window.gapi.client.init({
  apiKey: 'AIzaSyAjK1mi8amRdHYTQbeZIdGUlCH7mahevxg',
  clientId: '960214299334-4nc7ad24u3cenam0j1bo4d3t5cbh5akg.apps.googleusercontent.com',
  scope: 'profile https://www.googleapis.com/auth/drive.file',
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
}).then(function () {
  window.gapi.auth2.getAuthInstance().isSignedIn.listen(status => store.set({ signInStatus:status }))

  const status = window.gapi.auth2.getAuthInstance().isSignedIn.get()
  store.set({
    signInStatus:status,
    gapiLoaded: true
  })
  return window.gapi
}).catch(e => console.error(e)))

export default gclient