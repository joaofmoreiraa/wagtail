import { Application, Controller } from '@hotwired/stimulus';
import { initStimulus } from './initStimulus';

jest.useFakeTimers();

/**
 * Example controller.
 */
class WordCountController extends Controller {
  static values = { max: { default: 10, type: Number } };

  connect() {
    const output = document.createElement('output');
    output.setAttribute('name', 'word-count');
    output.setAttribute('for', this.element.id);
    output.style.float = 'inline-end';
    this.element.insertAdjacentElement('beforebegin', output);
    this.output = output;
    this.updateCount();
  }

  setupOutput() {
    if (this.output) return;
    const template = document.createElement('template');
    template.innerHTML = `<output name='word-count' for='${this.element.id}' class='output-label'></output>`;
    const output = template.content.firstChild;
    this.element.insertAdjacentElement('beforebegin', output);
    this.output = output;
  }

  updateCount(event) {
    const value = event ? event.target.value : this.element.value;
    const words = (value || '').split(' ');
    this.output.textContent = `${words.length} / ${this.maxValue} words`;
  }

  disconnect() {
    this.output && this.output.remove();
  }
}

describe('initStimulus', () => {
  const mockControllerConnected = jest.fn();

  class TestMockController extends Controller {
    static targets = ['item'];

    connect() {
      mockControllerConnected();
      this.itemTargets.forEach((item) => {
        item.setAttribute('hidden', '');
      });
    }
  }

  beforeEach(() => {
    document.body.innerHTML = `
    <main>
      <section data-controller="w-test-mock">
        <div id="item" data-w-test-mock-target="item"></div>
      </section>
    </main>`;
  });

  let application;

  it('should initialise a stimulus application', () => {
    const definitions = [
      { identifier: 'w-test-mock', controllerConstructor: TestMockController },
    ];

    expect(mockControllerConnected).not.toHaveBeenCalled();

    application = initStimulus({ debug: false, definitions });

    expect(application).toBeInstanceOf(Application);
  });

  it('should have set the debug value based on the option provided', () => {
    expect(application.debug).toEqual(false);
  });

  it('should have loaded the controller definitions supplied', () => {
    expect(mockControllerConnected).toHaveBeenCalled();
    expect(application.controllers).toHaveLength(1);
    expect(application.controllers[0]).toBeInstanceOf(TestMockController);
  });

  it('should support the documented approach for registering a controller via a class with register', async () => {
    const section = document.createElement('section');
    section.id = 'example-b';
    section.innerHTML = `<input value="some words" id="example-b-input" data-controller="example-b" data-action="change->example-b#updateCount" data-example-b-max-value="5" />`;

    // register a controller
    application.register('example-b', WordCountController);

    // before controller element added - should not include an `output` element
    expect(document.querySelector('#example-b > output')).toEqual(null);

    document.querySelector('section').after(section);

    await Promise.resolve();

    // after controller connected - should have an output element
    expect(document.querySelector('#example-b > output').innerHTML).toEqual(
      '2 / 5 words',
    );

    await Promise.resolve();

    // should respond to changes on the input
    const input = document.querySelector('#example-b > input');
    input.setAttribute('value', 'even more words');
    input.dispatchEvent(new Event('change'));

    expect(document.querySelector('#example-b > output').innerHTML).toEqual(
      '3 / 5 words',
    );

    // removal of the input should also remove the output (disconnect method)
    input.remove();

    await Promise.resolve();

    // should call the disconnect method (removal of the injected HTML)
    expect(document.querySelector('#example-b > output')).toEqual(null);

    // clean up
    section.remove();
  });

  describe('querying controllers', () => {
    it('should allow querying for a controller by identifier', () => {
      const controller = application.queryController('w-test-mock');
      expect(controller).toBeInstanceOf(TestMockController);
      expect(controller.itemTargets).toHaveLength(1);
      expect(controller.itemTargets[0].id).toEqual('item');
    });

    it('should return null if no controller is found for the identifier', () => {
      const controller = application.queryController('non-existent-controller');
      expect(controller).toBeNull();
    });

    it('should return the first controller found for the identifier', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        /* html */ `
          <footer>
            <section data-controller="w-test-mock">
              <div id="item2" data-w-test-mock-target="item"></div>
            </section>
          </footer>
        `,
      );
      await Promise.resolve();
      const controller = application.queryController('w-test-mock');
      expect(controller).toBeInstanceOf(TestMockController);
      expect(controller.itemTargets).toHaveLength(1);
      expect(controller.itemTargets[0].id).toEqual('item');
    });

    it('should allow querying for all controllers by identifier', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        /* html */ `
          <footer>
            <section data-controller="w-test-mock">
              <div id="item2" data-w-test-mock-target="item"></div>
            </section>
          </footer>
        `,
      );
      await Promise.resolve();
      const controllers = application.queryControllerAll('w-test-mock');
      expect(controllers).toHaveLength(2);
      expect(controllers[0]).toBeInstanceOf(TestMockController);
      expect(controllers[1]).toBeInstanceOf(TestMockController);
      expect(controllers[0].itemTargets[0].id).toEqual('item');
      expect(controllers[1].itemTargets[0].id).toEqual('item2');
    });

    it('should match a controller on an element with multiple controllers', async () => {
      application.register('example-b', WordCountController);
      document.body.insertAdjacentHTML(
        'beforeend',
        /* html */ `
          <footer>
            <input value="some words" data-controller="w-test-mock example-b" />
          </footer>
        `,
      );
      await Promise.resolve();
      const controller = application.queryController('example-b');
      expect(controller).toBeInstanceOf(WordCountController);
      expect(controller.output).not.toBeNull();
      expect(controller.output.textContent).toEqual('2 / 10 words');

      const controllers = application.queryControllerAll('w-test-mock');
      expect(controllers).toHaveLength(2);
      expect(controllers[0]).toBeInstanceOf(TestMockController);
      expect(controllers[1]).toBeInstanceOf(TestMockController);
      expect(controllers[0].itemTargets.length).toEqual(1);
      expect(controllers[1].itemTargets.length).toEqual(0);
    });
  });
});
