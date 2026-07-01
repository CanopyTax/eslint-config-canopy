import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-hardcoded-color.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-hardcoded-color', rule, {
  valid: [
    { code: `const el = <div style={{ color: 'var(--cp-color-app-text)' }} />` },
    { code: `const el = <div style={{ background: 'var(--cp-color-app-bg)' }} />` },
    { code: `const el = <div style={{ color: colorVar }} />` },
    { code: `const el = <div style={{ padding: '8px' }} />` },
    { code: 'const el = <div style={{ color: `var(--cp-color-app-text)` }} />' },
    { code: 'const el = <div style={{ color: `${colorVar}` }} />' },
    { code: `const el = <div style={{ color: '#12345' }} />` },
    { code: `tw("bg-[var(--cp-color-app-border)]")` },
    { code: `const el = <div className={tw("text-[var(--cp-color-app-text)]")} />` },
    { code: `tw("flex p-4 rounded-md")` },
    { code: `const el = <div className={tw("text-sm font-semibold")} />` },
    { code: `const el = <div className="text-sm p-4" />` },
    { code: `tw("bg-red-500 text-white")` },
    { code: `const el = <div className="bg-blue-300 border-gray-100" />` },
    { code: `const id = '#000'` },
    { code: `const color = 'rgb(0, 0, 0)'` },
  ],

  invalid: [
    {
      code: `const el = <div style={{ color: '#000' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `const el = <div style={{ color: '#ff0000' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#ff0000' } }],
    },
    {
      code: `const el = <div style={{ color: '#ff000080' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#ff000080' } }],
    },
    {
      code: `const el = <div style={{ color: '#000', background: '#fff' }} />`,
      errors: [
        { messageId: 'noHardcodedColor', data: { value: '#000' } },
        { messageId: 'noHardcodedColor', data: { value: '#fff' } },
      ],
    },
    {
      code: `const el = <div style={{ color: 'rgb(0, 0, 0)' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'rgb(0, 0, 0)' } }],
    },
    {
      code: `const el = <div style={{ color: 'rgba(0, 0, 0, 0.5)' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'rgba(0, 0, 0, 0.5)' } }],
    },
    {
      code: `const el = <div style={{ color: 'hsl(0, 0%, 0%)' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'hsl(0, 0%, 0%)' } }],
    },
    {
      code: `const el = <div style={{ color: 'hsla(0, 0%, 0%, 1)' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'hsla(0, 0%, 0%, 1)' } }],
    },
    {
      code: `const el = <div style={{ color: 'var(--some-other-var)' }} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'var(--some-other-var)' } }],
    },
    {
      code: 'const el = <div style={{ color: `#000` }} />',
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: 'const el = <div style={{ color: `rgb(0, 0, 0)` }} />',
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'rgb(0, 0, 0)' } }],
    },
    {
      code: 'const el = <div style={{ color: `var(--some-other-var)` }} />',
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'var(--some-other-var)' } }],
    },
    {
      code: `tw("text-[#000]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `tw("flex text-[#ff0000] p-4")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#ff0000' } }],
    },
    {
      code: `tw("text-[#000] bg-[#fff]")`,
      errors: [
        { messageId: 'noHardcodedColor', data: { value: '#000' } },
        { messageId: 'noHardcodedColor', data: { value: '#fff' } },
      ],
    },
    {
      code: `tw("[color:#000]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `tw("text-[rgb(0,0,0)]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'rgb(0,0,0)' } }],
    },
    {
      code: `tw("bg-[rgba(255,0,0,0.5)]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'rgba(255,0,0,0.5)' } }],
    },
    {
      code: `tw("text-[hsl(0,0%,0%)]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'hsl(0,0%,0%)' } }],
    },
    {
      code: `tw("[color:hsl(200,50%,50%)]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'hsl(200,50%,50%)' } }],
    },
    {
      code: `tw("text-[var(--some-var)]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'var(--some-var)' } }],
    },
    {
      code: `const el = <div className="bg-[var(--other-color)]" />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'var(--other-color)' } }],
    },
    {
      code: `always("text-[#abc123]")`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#abc123' } }],
    },
    {
      code: `const el = <div className={tw("text-[#000]")} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `const el = <div className={tw("bg-[#ff0000]")} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#ff0000' } }],
    },
    {
      code: `const el = <div className="text-[#abc]" />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#abc' } }],
    },
    {
      code: `const el = <div className={isActive && "text-[#000]"} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `const el = <div className={cond ? "text-[#000]" : "text-blue-500"} />`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `tw(toggle(cond, "text-[#000]", "text-white"))`,
      errors: [{ messageId: 'noHardcodedColor', data: { value: '#000' } }],
    },
    {
      code: `tw("bg-red-500")`,
      options: [{ checkTailwindColors: true }],
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'bg-red-500' } }],
    },
    {
      code: `tw("flex bg-blue-300 p-4")`,
      options: [{ checkTailwindColors: true }],
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'bg-blue-300' } }],
    },
    {
      code: `tw("text-white border-gray-100")`,
      options: [{ checkTailwindColors: true }],
      errors: [
        { messageId: 'noHardcodedColor', data: { value: 'text-white' } },
        { messageId: 'noHardcodedColor', data: { value: 'border-gray-100' } },
      ],
    },
    {
      code: `tw("hover:bg-red-500")`,
      options: [{ checkTailwindColors: true }],
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'hover:bg-red-500' } }],
    },
    {
      code: `const el = <div className="bg-slate-200 text-sm" />`,
      options: [{ checkTailwindColors: true }],
      errors: [{ messageId: 'noHardcodedColor', data: { value: 'bg-slate-200' } }],
    },
  ],
});
