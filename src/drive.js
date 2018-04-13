import googleApi from 'src/google'
import MultiPartBuilder from 'src/lib/multipart'

const DEFAULT_FIELDS = 'id,name,mimeType,headRevisionId,version'

export function saveFile (file, doc) {
  if (file.name) {
    return googleApi.then(function (gapi) {
      let path
      let method
      let fileObj = Object.assign({}, file)
      if (file.id) {
        path = '/upload/drive/v3/files/' + encodeURIComponent(file.id)
        method = 'PATCH'
        fileObj = { name }
      } else {
        path = '/upload/drive/v3/files'
        method = 'POST'
      }

      let multipart = new MultiPartBuilder().append('application/json', JSON.stringify(fileObj)).
      append(file.mimeType, doc).finish()

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
      console.log(response.result)
      return response.result
    })
  } else {
    return Promise.resolve({})
  }
}