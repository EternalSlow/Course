import React, { Component, useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { reportApplicationError, wasApplicationErrorReported } from './api';

const ErrorLog = registerPlugin('ErrorLog');

function resolvedIp(host) {
  if (host.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return host;
  return 'Недоступен в браузере: браузер не передаёт результат DNS-поиска.';
}

function ErrorDetails({ error }) {
  return (
    <details className="diagnostic-details">
      <summary>Технические сведения</summary>
      <dl>
        <dt>Тип</dt><dd>{error.kind || error.name}</dd>
        <dt>Код ошибки</dt><dd>{error.code || error.status || error.name || 'Недоступен'}</dd>
        {error.requestUrl && <><dt>Запрос</dt><dd>{error.method} {error.requestUrl}</dd></>}
        {error.serverHost && <><dt>Сервер</dt><dd>{error.serverHost}:{error.serverPort}</dd></>}
        {error.serverHost && <><dt>IP-адрес</dt><dd>{resolvedIp(error.serverHost)}</dd></>}
        {error.status && <><dt>HTTP</dt><dd>{error.status} {error.statusText}</dd></>}
        <dt>Соединение устройства</dt><dd>{error.online ? 'Сеть подключена' : 'Устройство не в сети'}</dd>
        <dt>Страница</dt><dd>{error.route}</dd>
        <dt>Время</dt><dd>{error.time}</dd>
      </dl>
      {error.source && <p>Источник: {error.source}</p>}
      {error.stack && <pre>{error.stack}</pre>}
    </details>
  );
}

export default function ErrorDiagnostics() {
  const [errors, setErrors] = useState([]);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    const handleReportedError = (event) => {
      setErrors((current) => [...current, event.detail].slice(-20));
    };
    const handleRuntimeError = (event) => {
      const target = event.target;
      if (target && target !== window && (target.src || target.href)) {
        const failedUrl = new URL(target.src || target.href, window.location.href);
        reportApplicationError(new Error('Не удалось загрузить ресурс'), {
          kind: 'resource',
          source: `${failedUrl.origin}${failedUrl.pathname}`,
        });
        return;
      }

      reportApplicationError(event.error || event.message, {
        kind: 'runtime',
        source: event.filename
          ? `${event.filename}:${event.lineno}:${event.colno}`
          : 'Ошибка выполнения приложения',
      });
    };
    const handleUnhandledRejection = (event) => {
      if (wasApplicationErrorReported(event.reason)) return;
      reportApplicationError(event.reason, { kind: 'unhandled promise' });
    };

    window.addEventListener('app:error', handleReportedError);
    window.addEventListener('error', handleRuntimeError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('app:error', handleReportedError);
      window.removeEventListener('error', handleRuntimeError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (errors.length === 0) return null;

  const error = errors.at(-1);

  const downloadErrorLog = async () => {
    const filename = `byte-errors-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const log = {
      app: 'Byte',
      generatedAt: new Date().toISOString(),
      page: window.location.pathname,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      errors,
    };
    const content = JSON.stringify(log, null, 2);

    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const result = await ErrorLog.saveAndOpenFolder({ filename, content });
        if (result.cancelled) {
          setExportMessage('Сохранение отменено.');
          return;
        }
        if (result.folderError) {
          reportApplicationError(new Error(result.folderError), { kind: 'diagnostic folder' });
        }
        setExportMessage(result.folderOpened
          ? 'Файл сохранён в Downloads/Byte. Открыт выбор этой папки.'
          : 'Файл сохранён в Downloads/Byte. Выбор папки не открылся.');
        return;
      }

      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage('Файл загружен. Браузер не может открыть папку автоматически.');
    } catch (exportError) {
      reportApplicationError(exportError, { kind: 'diagnostic export' });
      setExportMessage('Не удалось сохранить файл диагностики. Сведения об ошибке добавлены ниже.');
    }
  };

  return (
    <section className="error-diagnostics" aria-label="Диагностика ошибок" aria-live="assertive">
      <div className="diagnostic-heading">
        <strong>Обнаружена ошибка приложения</strong>
        <div className="diagnostic-actions">
          <button type="button" onClick={downloadErrorLog}>
            Скачать журнал и открыть папку
          </button>
          <button type="button" onClick={() => setErrors([])} aria-label="Закрыть сведения об ошибке">
            Закрыть
          </button>
        </div>
      </div>
      <p className="diagnostic-message">{error.message}</p>
      <ErrorDetails error={error} />
      {exportMessage && <p className="diagnostic-export-message" role="status">{exportMessage}</p>}
      {errors.length > 1 && <p>Сохранено последних ошибок: {errors.length}. Показана последняя.</p>}
    </section>
  );
}

export class ApplicationErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportApplicationError(error, {
      kind: 'render',
      source: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <main className="application-fatal-error" role="alert">
          <h1>Приложение не может продолжить работу</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Перезагрузить приложение
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
