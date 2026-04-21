function createError(message, index, source) {
  const previewStart = Math.max(0, index - 40)
  const previewEnd = Math.min(source.length, index + 40)
  const preview = source.slice(previewStart, previewEnd).replace(/\s+/g, ' ')
  return new Error(`${message} at index ${index}: ${preview}`)
}

export class SquirrelSubsetParser {
  constructor(source, startIndex = 0) {
    this.source = source
    this.index = startIndex
  }

  clone(startIndex = this.index) {
    return new SquirrelSubsetParser(this.source, startIndex)
  }

  isAtEnd() {
    return this.index >= this.source.length
  }

  peek(length = 1) {
    return this.source.slice(this.index, this.index + length)
  }

  skipIgnored() {
    while (!this.isAtEnd()) {
      const character = this.source[this.index]

      if (/\s/.test(character)) {
        this.index += 1
        continue
      }

      if (this.peek(2) === '//') {
        this.index += 2

        while (!this.isAtEnd() && this.source[this.index] !== '\n') {
          this.index += 1
        }

        continue
      }

      if (this.peek(2) === '/*') {
        const commentEndIndex = this.source.indexOf('*/', this.index + 2)

        if (commentEndIndex === -1) {
          throw createError('Unterminated block comment', this.index, this.source)
        }

        this.index = commentEndIndex + 2
        continue
      }

      break
    }
  }

  readKeyword(keyword) {
    this.skipIgnored()

    if (!this.source.startsWith(keyword, this.index)) {
      return false
    }

    const nextCharacter = this.source[this.index + keyword.length] ?? ''

    if (/[A-Za-z0-9_]/.test(nextCharacter)) {
      return false
    }

    this.index += keyword.length
    return true
  }

  readSymbol(symbol) {
    this.skipIgnored()

    if (!this.source.startsWith(symbol, this.index)) {
      return false
    }

    this.index += symbol.length
    return true
  }

  expectSymbol(symbol) {
    if (!this.readSymbol(symbol)) {
      throw createError(`Expected "${symbol}"`, this.index, this.source)
    }
  }

  readIdentifier() {
    this.skipIgnored()
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.source.slice(this.index))

    if (!match) {
      return null
    }

    this.index += match[0].length
    return match[0]
  }

  expectIdentifier() {
    const identifier = this.readIdentifier()

    if (identifier === null) {
      throw createError('Expected identifier', this.index, this.source)
    }

    return identifier
  }

  readNumber() {
    this.skipIgnored()
    const match = /^[+-]?(?:\d+\.\d+|\d+|\.\d+)/.exec(this.source.slice(this.index))

    if (!match) {
      return null
    }

    this.index += match[0].length
    return Number(match[0])
  }

  readQuotedString() {
    this.skipIgnored()

    if (this.source[this.index] !== '"') {
      return null
    }

    let value = ''
    this.index += 1

    while (!this.isAtEnd()) {
      const character = this.source[this.index]

      if (character === '\\') {
        const nextCharacter = this.source[this.index + 1] ?? ''

        switch (nextCharacter) {
          case 'n':
            value += '\n'
            break
          case 'r':
            value += '\r'
            break
          case 't':
            value += '\t'
            break
          case '"':
            value += '"'
            break
          case '\\':
            value += '\\'
            break
          default:
            value += nextCharacter
            break
        }

        this.index += 2
        continue
      }

      if (character === '"') {
        this.index += 1
        return value
      }

      value += character
      this.index += 1
    }

    throw createError('Unterminated string literal', this.index, this.source)
  }

  readRawString() {
    this.skipIgnored()

    if (this.peek(2) !== '@"') {
      return null
    }

    this.index += 2
    const startIndex = this.index
    const endIndex = this.source.indexOf('"', this.index)

    if (endIndex === -1) {
      throw createError('Unterminated raw string literal', startIndex, this.source)
    }

    this.index = endIndex + 1
    return this.source.slice(startIndex, endIndex)
  }

  readReference() {
    this.skipIgnored()
    const startIndex = this.index
    let value = ''

    if (this.peek(2) === '::') {
      value += '::'
      this.index += 2
    }

    const firstIdentifier = this.readIdentifier()

    if (firstIdentifier === null) {
      this.index = startIndex
      return null
    }

    value += firstIdentifier

    while (true) {
      const checkpoint = this.index

      if (!this.readSymbol('.')) {
        this.index = checkpoint
        break
      }

      const identifier = this.readIdentifier()

      if (identifier === null) {
        this.index = checkpoint
        break
      }

      value += `.${identifier}`
    }

    return value
  }

  parseFunctionLiteral() {
    const functionStartIndex = this.index

    if (!this.readKeyword('function')) {
      return null
    }

    this.skipIgnored()
    let name = null

    if (/[A-Za-z_:]/.test(this.source[this.index] ?? '')) {
      const checkpoint = this.index
      name = this.readIdentifier()

      if (name !== null) {
        this.skipIgnored()

        if (this.source[this.index] !== '(') {
          this.index = checkpoint
          name = null
        }
      }
    }

    this.expectSymbol('(')
    const parametersStartIndex = this.index
    const parametersEndIndex = this.findMatchingBoundary('(', ')', parametersStartIndex - 1)
    const parametersSource = this.source
      .slice(parametersStartIndex, parametersEndIndex)
      .trim()
    const parameters = parametersSource
      ? splitTopLevelCommaSeparated(parametersSource).map((parameter) => parameter.trim()).filter(Boolean)
      : []

    this.index = parametersEndIndex + 1
    this.skipIgnored()
    this.expectSymbol('{')
    const bodyStartIndex = this.index
    const bodyEndIndex = this.findMatchingBoundary('{', '}', bodyStartIndex - 1)
    const body = this.source.slice(bodyStartIndex, bodyEndIndex)
    this.index = bodyEndIndex + 1

    return {
      type: 'function',
      body,
      name,
      parameters,
      source: this.source.slice(functionStartIndex, this.index),
    }
  }

  parseArrayLiteral() {
    if (!this.readSymbol('[')) {
      return null
    }

    const values = []

    while (true) {
      this.skipIgnored()

      if (this.readSymbol(']')) {
        break
      }

      values.push(this.parseValue())
      this.skipIgnored()

      if (this.readSymbol(',')) {
        continue
      }

      this.expectSymbol(']')
      break
    }

    return {
      type: 'array',
      values,
    }
  }

  parseTableLiteral() {
    if (!this.readSymbol('{')) {
      return null
    }

    const entries = []

    while (true) {
      this.skipIgnored()

      if (this.readSymbol('}')) {
        break
      }

      const functionCheckpoint = this.index
      const functionLiteral = this.parseFunctionLiteral()

      if (functionLiteral !== null) {
        entries.push({
          type: 'function-entry',
          body: functionLiteral.body,
          name: functionLiteral.name,
          parameters: functionLiteral.parameters,
        })
      } else {
        this.index = functionCheckpoint
        const key = this.expectIdentifier()
        this.skipIgnored()

        if (!(this.readSymbol('=') || this.readSymbol('<-'))) {
          throw createError(`Expected table assignment for "${key}"`, this.index, this.source)
        }

        const value = this.parseValue()
        entries.push({
          type: 'property',
          key,
          value,
        })
      }

      this.skipIgnored()
      this.readSymbol(',')
    }

    return {
      type: 'table',
      entries,
    }
  }

  parsePrimaryValue() {
    this.skipIgnored()
    const rawString = this.readRawString()

    if (rawString !== null) {
      return rawString
    }

    const quotedString = this.readQuotedString()

    if (quotedString !== null) {
      return quotedString
    }

    const functionLiteral = this.parseFunctionLiteral()

    if (functionLiteral !== null) {
      return functionLiteral
    }

    const arrayLiteral = this.parseArrayLiteral()

    if (arrayLiteral !== null) {
      return arrayLiteral
    }

    const tableLiteral = this.parseTableLiteral()

    if (tableLiteral !== null) {
      return tableLiteral
    }

    if (this.readKeyword('true')) {
      return true
    }

    if (this.readKeyword('false')) {
      return false
    }

    if (this.readKeyword('null')) {
      return null
    }

    const numberValue = this.readNumber()

    if (numberValue !== null && Number.isFinite(numberValue)) {
      return numberValue
    }

    const reference = this.readReference()

    if (reference !== null) {
      return {
        type: 'reference',
        value: reference,
      }
    }

    throw createError('Unable to parse value', this.index, this.source)
  }

  parseValue() {
    const primaryValue = this.parsePrimaryValue()

    if (primaryValue === null || typeof primaryValue !== 'object' || primaryValue.type !== 'reference') {
      return primaryValue
    }

    let currentValue = primaryValue

    while (true) {
      this.skipIgnored()

      if (!this.readSymbol('[')) {
        break
      }

      const contentStartIndex = this.index
      const contentEndIndex = this.findMatchingBoundary('[', ']', contentStartIndex - 1)
      currentValue = {
        type: 'reference',
        value: `${currentValue.value}[${this.source.slice(contentStartIndex, contentEndIndex).trim()}]`,
      }
      this.index = contentEndIndex + 1
    }

    if (!this.readSymbol('(')) {
      return currentValue
    }

    const argumentsList = []

    while (true) {
      this.skipIgnored()

      if (this.readSymbol(')')) {
        break
      }

      argumentsList.push(this.parseValue())
      this.skipIgnored()

      if (this.readSymbol(',')) {
        continue
      }

      this.expectSymbol(')')
      break
    }

    return {
      type: 'call',
      arguments: argumentsList,
      callee: currentValue.value,
    }
  }

  parseStatement() {
    this.skipIgnored()

    if (this.isAtEnd()) {
      return null
    }

    if (this.source[this.index] === '}') {
      return null
    }

    const skippedKeywords = ['if', 'else', 'for', 'foreach', 'while', 'switch', 'case', 'return', 'break', 'continue']

    for (const keyword of skippedKeywords) {
      const checkpoint = this.index

      if (this.readKeyword(keyword)) {
        this.skipUnknownStatement()
        return {
          type: 'unknown',
          source: this.source.slice(checkpoint, this.index),
        }
      }

      this.index = checkpoint
    }

    if (this.readKeyword('local')) {
      const target = this.expectIdentifier()
      this.skipIgnored()

      if (!(this.readSymbol('=') || this.readSymbol('<-'))) {
        throw createError(`Expected local assignment for "${target}"`, this.index, this.source)
      }

      const value = this.parseValue()
      this.readSymbol(';')

      return {
        type: 'local-assignment',
        target,
        value,
      }
    }

    const statementStartIndex = this.index
    const reference = this.readReference()

    if (reference === null) {
      this.skipUnknownStatement()
      return {
        type: 'unknown',
        source: this.source.slice(statementStartIndex, this.index),
      }
    }

    this.skipIgnored()

    if (this.readSymbol('<-')) {
      const value = this.parseValue()
      this.readSymbol(';')

      return {
        type: 'assignment',
        operator: '<-',
        target: reference,
        value,
      }
    }

    if (this.readSymbol('=')) {
      const value = this.parseValue()
      this.readSymbol(';')

      return {
        type: 'assignment',
        operator: '=',
        target: reference,
        value,
      }
    }

    if (this.readSymbol('+=')) {
      const value = this.parseValue()
      this.readSymbol(';')

      return {
        type: 'assignment',
        operator: '+=',
        target: reference,
        value,
      }
    }

    if (this.readSymbol('-=')) {
      const value = this.parseValue()
      this.readSymbol(';')

      return {
        type: 'assignment',
        operator: '-=',
        target: reference,
        value,
      }
    }

    if (this.readSymbol('(')) {
      this.index -= 1
      this.index = statementStartIndex
      try {
        const expression = this.parseValue()
        this.readSymbol(';')

        return {
          type: 'expression',
          expression,
        }
      } catch {
        this.index = statementStartIndex
        this.skipUnknownStatement()

        return {
          type: 'unknown',
          source: this.source.slice(statementStartIndex, this.index),
        }
      }
    }

    this.skipUnknownStatement()

    return {
      type: 'unknown',
      source: this.source.slice(statementStartIndex, this.index),
    }
  }

  skipUnknownStatement() {
    this.skipIgnored()

    while (!this.isAtEnd()) {
      const character = this.source[this.index]

      if (character === ';') {
        this.index += 1
        return
      }

      if (character === '{') {
        const endIndex = this.findMatchingBoundary('{', '}', this.index)
        this.index = endIndex + 1
        return
      }

      if (character === '\n') {
        this.index += 1
        return
      }

      if (character === '"' || this.peek(2) === '@"') {
        this.parsePrimaryValue()
        continue
      }

      if (this.peek(2) === '/*' || this.peek(2) === '//') {
        this.skipIgnored()
        continue
      }

      this.index += 1
    }
  }

  findMatchingBoundary(openCharacter, closeCharacter, openCharacterIndex) {
    let depth = 0
    let position = openCharacterIndex

    while (position < this.source.length) {
      const twoCharacters = this.source.slice(position, position + 2)
      const character = this.source[position]

      if (twoCharacters === '//') {
        position += 2

        while (position < this.source.length && this.source[position] !== '\n') {
          position += 1
        }

        continue
      }

      if (twoCharacters === '/*') {
        const endIndex = this.source.indexOf('*/', position + 2)

        if (endIndex === -1) {
          throw createError('Unterminated block comment', position, this.source)
        }

        position = endIndex + 2
        continue
      }

      if (twoCharacters === '@"') {
        position += 2
        const endIndex = this.source.indexOf('"', position)

        if (endIndex === -1) {
          throw createError('Unterminated raw string literal', position, this.source)
        }

        position = endIndex + 1
        continue
      }

      if (character === '"') {
        position += 1

        while (position < this.source.length) {
          if (this.source[position] === '\\') {
            position += 2
            continue
          }

          if (this.source[position] === '"') {
            position += 1
            break
          }

          position += 1
        }

        continue
      }

      if (character === openCharacter) {
        depth += 1
        position += 1
        continue
      }

      if (character === closeCharacter) {
        depth -= 1

        if (depth === 0) {
          return position
        }

        position += 1
        continue
      }

      position += 1
    }

    throw createError(`Unable to find matching "${closeCharacter}"`, openCharacterIndex, this.source)
  }
}

export function parseSquirrelValue(source, startIndex = 0) {
  const parser = new SquirrelSubsetParser(source, startIndex)
  const value = parser.parseValue()
  return {
    endIndex: parser.index,
    value,
  }
}

export function collectTopLevelStatements(source) {
  const parser = new SquirrelSubsetParser(source)
  const statements = []

  while (true) {
    parser.skipIgnored()

    if (parser.isAtEnd()) {
      break
    }

    const statement = parser.parseStatement()

    if (statement !== null) {
      statements.push(statement)
    } else {
      break
    }
  }

  return statements
}

export function splitTopLevelCommaSeparated(source) {
  const items = []
  let startIndex = 0
  let braceDepth = 0
  let bracketDepth = 0
  let parenthesesDepth = 0
  let index = 0

  while (index < source.length) {
    const twoCharacters = source.slice(index, index + 2)
    const character = source[index]

    if (twoCharacters === '//') {
      index += 2

      while (index < source.length && source[index] !== '\n') {
        index += 1
      }

      continue
    }

    if (twoCharacters === '/*') {
      const endIndex = source.indexOf('*/', index + 2)

      if (endIndex === -1) {
        throw createError('Unterminated block comment', index, source)
      }

      index = endIndex + 2
      continue
    }

    if (twoCharacters === '@"') {
      index += 2
      const endIndex = source.indexOf('"', index)

      if (endIndex === -1) {
        throw createError('Unterminated raw string literal', index, source)
      }

      index = endIndex + 1
      continue
    }

    if (character === '"') {
      index += 1

      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          continue
        }

        if (source[index] === '"') {
          index += 1
          break
        }

        index += 1
      }

      continue
    }

    if (character === '{') {
      braceDepth += 1
      index += 1
      continue
    }

    if (character === '}') {
      braceDepth -= 1
      index += 1
      continue
    }

    if (character === '[') {
      bracketDepth += 1
      index += 1
      continue
    }

    if (character === ']') {
      bracketDepth -= 1
      index += 1
      continue
    }

    if (character === '(') {
      parenthesesDepth += 1
      index += 1
      continue
    }

    if (character === ')') {
      parenthesesDepth -= 1
      index += 1
      continue
    }

    if (
      character === ',' &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      parenthesesDepth === 0
    ) {
      const item = source.slice(startIndex, index).trim()

      if (item) {
        items.push(item)
      }

      startIndex = index + 1
    }

    index += 1
  }

  const finalItem = source.slice(startIndex).trim()

  if (finalItem) {
    items.push(finalItem)
  }

  return items
}

export function unwrapReference(value) {
  return typeof value === 'object' && value !== null && value.type === 'reference'
    ? value.value
    : null
}

export function unwrapCall(value) {
  return typeof value === 'object' && value !== null && value.type === 'call' ? value : null
}

export function unwrapTable(value) {
  return typeof value === 'object' && value !== null && value.type === 'table' ? value : null
}

export function unwrapArray(value) {
  return typeof value === 'object' && value !== null && value.type === 'array' ? value : null
}
