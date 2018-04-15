import googleApi from 'src/google'
import MultiPartBuilder from 'src/lib/multipart'

const mime = 'application/json'

const createPicker = (accessToken, callback) => {
  var view = new window.google.picker.View(window.google.picker.ViewId.DOCS)
  view.setMimeTypes(mime)
  return new window.google.picker.PickerBuilder()
  // .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
  //  .setAppId('960214299334')
    .setOAuthToken(accessToken)
    .addView(view)
    .setDeveloperKey('AIzaSyAjK1mi8amRdHYTQbeZIdGUlCH7mahevxg')
    .setCallback(data => {
      if (data.action === window.google.picker.Action.PICKED) {
        callback(data.docs[0])
      }
    })
    .build()
}

let picker = null

export function getPicker (accessToken, callback) {
  if (!picker) {
    picker = googleApi.then(gapi => new Promise(resolve => gapi.load('picker', {'callback': resolve})))
      .then(() => createPicker(accessToken, callback))
  }
  return picker
}

const DEFAULT_FIELDS = 'id,name,mimeType,headRevisionId,webContentLink'

export function getMeta (file) {
  if (!file.id) {
    return Promise.reject(new Error('missing file id'))
  }

  return googleApi.then(gapi => gapi.client.drive.files.get({
    'fileId': file.id,
    'fields': DEFAULT_FIELDS
  })).then(response => {
    return response.result
  })
}

export function loadFile (file) {
  if (!file.id) {
    return Promise.reject(new Error('missing file id'))
  }

  return googleApi.then(gapi => gapi.client.drive.files.get({
    'fileId': file.id,
    'alt': 'media'
  })).then(response => response.result)
}

export function saveFile (file, doc) {
  if (file.name) {
    return googleApi.then(function (gapi) {
      let path
      let method
      let fileObj = Object.assign({}, file)
      if (file.id) {
        path = '/upload/drive/v3/files/' + encodeURIComponent(file.id)
        method = 'PATCH'
        fileObj = {name: file.name}
      } else {
        path = '/upload/drive/v3/files'
        method = 'POST'
      }

      let multipart = new MultiPartBuilder().append('application/json', JSON.stringify(fileObj))
        .append(file.mimeType, doc)
        .finish()

      return gapi.client.request({
        path: path,
        method: method,
        params: {
          uploadType: 'multipart',
          supportsTeamDrives: true,
          fields: DEFAULT_FIELDS
        },
        headers: {'Content-Type': multipart.type},
        body: multipart.body
      })
    }).then(function (response) {
      return response.result
    })
  } else {
    return Promise.resolve({})
  }
}