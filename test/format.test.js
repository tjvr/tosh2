const fs = require("fs")
const JSZip = (global.JSZip = require("jszip"))
require("../phosphorus/phosphorus.js")

const Project = require("../format")

function readZip(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(name, (err, data) => {
      if (err) reject(err)
      const zip = new JSZip(data)
      resolve(zip)
    })
  })
}

describe("load/save", () => {
  test("nutella round-trip", () => {
    return readZip("test/projects/nutella.sb2").then(zip => {
      return Project.load(zip)
        .then(Project.save)
        .then(toshZip => {
          const json = JSON.parse(zip.file("project.json").asText())
          expect(json).toMatchSnapshot()
        })
    })
  })
})
