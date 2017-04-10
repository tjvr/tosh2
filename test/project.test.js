
const fs = require('fs')
const JSZip = global.JSZip = require('jszip')
//require('../phosphorus/phosphorus.js')

const {Project} = require('../project')



let readZip = function(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(name, (err, data) => {
      if (err) reject(err)
      const zip = new JSZip(data)
      resolve(zip)
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
          JSON.parse(zip.file('project.json').asText()),
          JSON.parse(toshZip.file('project.json').asText()),
        ]).then(([json, toshJson]) => {
          expect(json).toEqual(toshJson)
        })
      })
    })
  })

})

