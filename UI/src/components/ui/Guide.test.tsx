import { TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';
import { Guide, GuideOption, type GuideStep } from './Guide';

type Answers = { color: string | null; name: string };

const steps: GuideStep<Answers>[] = [
  {
    key: 'color',
    question: 'Vilken färg?',
    label: 'Färg',
    summary: (a) => a.color ?? '',
    canProceed: (a) => a.color !== null,
    render: (a, update) => (
      <>
        {['Röd', 'Blå'].map((c) => (
          <GuideOption key={c} label={c} selected={a.color === c} onPress={() => update({ color: c })} />
        ))}
      </>
    ),
  },
  {
    key: 'name',
    question: 'Vad heter du?',
    label: 'Namn',
    summary: (a) => a.name,
    canProceed: (a) => a.name.trim() !== '',
    render: (a, update) => (
      <TextInput accessibilityLabel="Namn" value={a.name} onChangeText={(name) => update({ name })} />
    ),
  },
];

const initial: Answers = { color: null, name: '' };

function setup(props: Partial<Parameters<typeof Guide<Answers>>[0]> = {}) {
  const onFinish = jest.fn();
  const onExit = jest.fn();
  return {
    onFinish,
    onExit,
    view: render(
      <Guide
        title="Test"
        steps={steps}
        initialAnswers={initial}
        onFinish={onFinish}
        onExit={onExit}
        {...props}
      />,
    ),
  };
}

const next = () => screen.getByRole('button', { name: 'Nästa' });

describe('Guide', () => {
  test('asks one question at a time and shows the progress', async () => {
    await setup().view;

    expect(screen.getByRole('header', { name: 'Vilken färg?' })).toBeOnTheScreen();
    expect(screen.queryByText('Vad heter du?')).toBeNull();
    // Two questions and the summary.
    expect(screen.getByRole('progressbar', { name: 'Steg 1 av 3' })).toBeOnTheScreen();
    // No "Bakåt" on the first question.
    expect(screen.queryByRole('button', { name: 'Bakåt' })).toBeNull();
  });

  test('"Nästa" is locked until the step can go on', async () => {
    await setup().view;
    expect(next()).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Blå' }));
    expect(screen.getByRole('radio', { name: 'Blå' })).toBeChecked();
    expect(next()).toBeEnabled();

    await fireEvent.press(next());
    expect(screen.getByRole('header', { name: 'Vad heter du?' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Steg 2 av 3' })).toBeOnTheScreen();
    expect(next()).toBeDisabled();
  });

  test('going back keeps the answers', async () => {
    await setup().view;
    await fireEvent.press(screen.getByRole('radio', { name: 'Röd' }));
    await fireEvent.press(next());
    await fireEvent.changeText(screen.getByLabelText('Namn'), 'Elsa');

    await fireEvent.press(screen.getByRole('button', { name: 'Bakåt' }));
    expect(screen.getByRole('radio', { name: 'Röd' })).toBeChecked();

    await fireEvent.press(next());
    expect(screen.getByLabelText('Namn').props.value).toBe('Elsa');
  });

  test('the summary shows every answer and "Bekräfta" sends them', async () => {
    const { onFinish, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole('radio', { name: 'Blå' }));
    await fireEvent.press(next());
    await fireEvent.changeText(screen.getByLabelText('Namn'), 'Elsa');
    await fireEvent.press(next());

    expect(screen.getByRole('header', { name: 'Stämmer det här?' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Steg 3 av 3' })).toBeOnTheScreen();
    expect(screen.getByText('Färg')).toBeOnTheScreen();
    expect(screen.getByText('Blå')).toBeOnTheScreen();
    expect(screen.getByText('Namn')).toBeOnTheScreen();
    expect(screen.getByText('Elsa')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Bekräfta' }));
    expect(onFinish).toHaveBeenCalledWith({ color: 'Blå', name: 'Elsa' });
  });

  test('the header arrow goes back a step, and leaves on the first step', async () => {
    const { onExit, view } = setup({ initialAnswers: { color: 'Röd', name: '' } });
    await view;
    // The initial answer is already picked.
    expect(screen.getByRole('radio', { name: 'Röd' })).toBeChecked();
    await fireEvent.press(next());

    await fireEvent.press(screen.getByRole('button', { name: 'Tillbaka' }));
    expect(screen.getByRole('header', { name: 'Vilken färg?' })).toBeOnTheScreen();
    expect(onExit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Tillbaka' }));
    expect(onExit).toHaveBeenCalled();
  });

  test('a step can put an action next to its question, only on that step', async () => {
    const onEdit = jest.fn();
    const withAction: GuideStep<Answers>[] = [
      { ...steps[0], headerAction: () => <Button title="Redigera" variant="link" onPress={onEdit} /> },
      steps[1],
    ];
    await setup({ steps: withAction }).view;

    await fireEvent.press(screen.getByRole('button', { name: 'Redigera' }));
    expect(onEdit).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Röd' }));
    await fireEvent.press(next());
    expect(screen.queryByRole('button', { name: 'Redigera' })).toBeNull();
  });

  test('the summary shows an error and locks "Bekräfta" while busy', async () => {
    await setup({ initialAnswers: { color: 'Röd', name: 'Elsa' }, error: 'Något gick fel', busy: true }).view;
    await fireEvent.press(next());
    await fireEvent.press(next());

    expect(screen.getByRole('alert')).toHaveTextContent('Något gick fel');
    expect(screen.getByRole('button', { name: 'Bekräfta' })).toBeDisabled();
  });
});
