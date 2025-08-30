'use strict'
window.onload = () => {
  function showDiff(node1, node2) {
    window.clearTimeout(timeoutId);

    let newStr1 = '';
    let newStr2 = '';
    const str1 = node1.textContent;
    const str2 = node2.textContent;
    for (let i = 0; i < str1.length; i++) {
      if (str2.includes(str1[i])) {
        newStr1 += str1[i];
      } else {
        const span1 = document.createElement('span');
        span1.classList.add('before');
        span1.textContent = str1[i];
        newStr1 += span1.outerHTML;
      }
    }
    for (let i = 0; i < str2.length; i++) {
      if (str1.includes(str2[i])) {
        newStr2 += str2[i];
      } else {
        const span2 = document.createElement('span');
        span2.classList.add('highlight');
        span2.textContent = str2[i];
        newStr2 += span2.outerHTML;
      }
    }
    node1.innerHTML = newStr1;
    node2.innerHTML = newStr2;
  }
  function handleInputChanges(event) {
    const input = event.target;
    if (event.target.type === 'checkbox') {
      const unchecked = [];
      const inputs = rules.getElementsByTagName('input');
      const label = rules.querySelector(`label[for="${input.id}"]`);
      const userConfig = document.getElementById('user-config');
      label.classList.toggle('checked');
      label.classList.toggle('unchecked');
      for (let input of inputs) {
        if (!input.checked) unchecked.push(`data-${input.id}="false"`);
        if (unchecked.length) userConfig.textContent = unchecked.join(' ');
        else userConfig.textContent = document.lang === 'en' ? 'all rules are applied' : 'все правила применяются';
      }
    }
  }
  let timeoutId;
  timeoutId = window.setTimeout(() => {
    const rules = document.getElementById('rules-container');
    const examples = document.getElementById('examples');
    const textarea = document.getElementById('user-before');
    const before = examples.getElementsByClassName('example-before');
    const after = examples.getElementsByClassName('example-after');
    const rulesCount = document.getElementById('rules-count');
    rulesCount.textContent = `${rules.getElementsByTagName('label').length}`;
    for (let i = 0; i < before.length; i++) {
      showDiff(before[i], after[i]);
    }
    let i = 0;
    for (let node of rules.childNodes) {
      if (node.nodeName === 'LABEL') {
        const count = node.childNodes[1].childNodes[1];
        const input = document.getElementById(node.htmlFor);
        count.textContent = `${++i}. `;
        if (input.checked) node.classList.add('checked');
        else node.classList.add('unchecked');
        input.addEventListener('change', handleInputChanges);
      }
    }
    textarea.addEventListener('input', () => {
      const textareaResult = document.getElementById('user-after');
      textareaResult.textContent = textarea.value;
    });
  }, 50);
}