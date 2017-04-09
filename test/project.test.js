
const fs = require('fs')
const JSZip = global.JSZip = require('jszip')

const {Project} = require('../project')



let readZip = function(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(name, (err, data) => {
      if (err) reject(err)
      JSZip.loadAsync(data).then(resolve)
    })
  })
}


describe('load/save', () => {

  test('nutella round-trip', () => {
    return readZip('test/projects/nutella.sb2').then(zip => {
      return Project.load(zip)
      .then(Project.save)
      .then(toshZip => {
        return Promise.all([
          zip.file('project.json').async('string').then(JSON.parse),
          toshZip.file('project.json').async('string').then(JSON.parse),
        ]).then(([json, toshJson]) => {
          expect(json).toEqual(toshJson)
        })
      })
    })
  })

})

