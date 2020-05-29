/**
 * @author Raymond
 */

const { get } = require('lodash');
const fs = require('fs');
const nodePath = require('path')

const namePattern = /\[name\]/g
const resolve = ['.js', '.jsx']
const defaultRelative = './[name].involve'

function hasInvolved(state) {
  try {
    state.opts.relative = state.opts.relative || defaultRelative
    let filename = state.opts.relative
    if (namePattern.test(state.opts.relative)) {
      const basename = nodePath.basename(state.filename, nodePath.extname(state.filename))
      filename = filename.replace(namePattern, basename)
    }
    const path = nodePath.resolve(nodePath.dirname(state.filename), filename)
    return resolve.some(ext => fs.existsSync(path + ext))
  } catch (error) {
    return false
  }
}

const cache = new Map()

module.exports = function ({ types: t }) {
  return {
    visitor: {
      ExportDefaultDeclaration(path, state) {
        let exportName = get(path, 'node.declaration.name') || get(path, 'node.declaration.id.name')
        if (exportName) {
          cache.set(state.filename, exportName)
        }
      },
      Program: {
        exit(path, state) {
          if (!hasInvolved(state)) {
            return
          }
          state.opts.relative = state.opts.relative || defaultRelative
          const filename = state.filename
          const basename = nodePath.basename(filename, nodePath.extname(filename))
          const exportName = cache.get(filename) || '_default'
          const program = path.scope.getProgramParent().path
          const id = state.opts.exportName || '__involve'
          const insert = t.importDeclaration([
            t.importDefaultSpecifier(t.identifier(id))
          ], t.stringLiteral(state.opts.relative.replace(namePattern, basename)))
          const info = t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(t.identifier(exportName), t.identifier(id)),
              t.identifier(id))
          )
          program.pushContainer('body', insert)
          program.pushContainer('body', info)
        }
      }
    }
  }
}
