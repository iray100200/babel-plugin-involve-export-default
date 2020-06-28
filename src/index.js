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
const defaultName = '_default'

module.exports = function ({ types: t }) {
  return {
    visitor: {
      ExportDefaultDeclaration(path, state) {
        let exportName = get(path, 'node.declaration.name') || get(path, 'node.declaration.id.name')
        if (exportName) {
          cache.set(state.filename, exportName)
        } else {
          path.node.declaration.id = t.identifier(defaultName)
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
          const program = path.scope.getProgramParent().path
          const exportName = cache.get(filename) || defaultName
          if (exportName === defaultName) {
            const body = program.get('body')
            /**
             * get the default export declaration node's index
             */
            const defaultExportNodeIndex = body.findIndex(node => {
              return node.isExportDefaultDeclaration()
            })
            const node = program.node.body.splice(defaultExportNodeIndex, 1)[0]
            /**
             * append a new variable declaration
             */
            program.node.body.push(
              t.variableDeclaration('var',
                [
                  t.variableDeclarator(t.identifier(defaultName), node.declaration)
                ])
            )
            /**
             * append the default exported declaration
             */
            program.node.body.push(t.exportDefaultDeclaration(t.identifier(defaultName)))
          }
          const id = state.opts.exportName || '__involve'
          const insert = t.importDeclaration([
            t.importDefaultSpecifier(t.identifier(id))
          ], t.stringLiteral(state.opts.relative.replace(namePattern, basename)))
          const info = t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(t.identifier(exportName), t.identifier(id)),
              t.identifier(id))
          )
          program.node.body.push(insert)
          program.node.body.push(info)
        }
      }
    }
  }
}
